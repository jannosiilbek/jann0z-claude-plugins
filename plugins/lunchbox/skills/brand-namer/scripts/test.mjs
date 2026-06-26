// ---------------------------------------------------------------------------
// Selftest for check-availability.mjs
//
// Covers the deterministic decision logic with NO network: name/TLD parsing,
// the IANA-bootstrap -> RDAP-map transform (incl. verified overrides), the
// tri-state status classifiers, WHOIS interpretation, and CLI arg parsing.
// A small CLI smoke test asserts the usage/exit-code contract (also offline).
//
// Run from this directory:  npm test   (i.e. node --test test.mjs)
// ---------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  normalizeName,
  parseList,
  tldOf,
  buildRdapMap,
  classifyRdap,
  interpretWhois,
  parseWhoisReferral,
  classifyRegistryStatus,
  parseArgs,
  makeHostLimiter,
} from './check-availability.mjs';

const tick = () => new Promise((r) => setTimeout(r, 5));

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'check-availability.mjs');

// ---- normalizeName --------------------------------------------------------

test('normalizeName lowercases and strips non-label characters', () => {
  assert.equal(normalizeName('Bright Stack!'), 'brightstack');
  assert.equal(normalizeName('  Lumira  '), 'lumira');
  assert.equal(normalizeName('Néon'), 'non'); // accented chars are dropped, not transliterated
  assert.equal(normalizeName('my-app'), 'my-app');
  assert.equal(normalizeName('--edge--'), 'edge'); // leading/trailing hyphens trimmed
});

// ---- parseList ------------------------------------------------------------

test('parseList splits on commas and whitespace, lowercases, drops empties', () => {
  assert.deepEqual(parseList('com, io ,AI'), ['com', 'io', 'ai']);
  assert.deepEqual(parseList('github  x   instagram'), ['github', 'x', 'instagram']);
  assert.deepEqual(parseList(''), []);
  assert.deepEqual(parseList(null), []);
});

// ---- tldOf ----------------------------------------------------------------

test('tldOf returns the last label', () => {
  assert.equal(tldOf('lumira.com'), 'com');
  assert.equal(tldOf('lumira.co.uk'), 'uk');
  assert.equal(tldOf('nodot'), '');
});

// ---- buildRdapMap ---------------------------------------------------------

test('buildRdapMap maps bootstrap TLDs to normalized base URLs', () => {
  const fixture = {
    services: [
      [['com', 'net'], ['https://rdap.verisign.com/com/v1']], // no trailing slash -> normalized
      [['app', 'dev', 'page'], ['https://pubapi.registry.google/rdap/']],
      [['ai'], ['https://rdap.identitydigital.services/rdap/']],
    ],
  };
  const map = buildRdapMap(fixture);
  assert.equal(map.get('com'), 'https://rdap.verisign.com/com/v1/');
  assert.equal(map.get('net'), 'https://rdap.verisign.com/com/v1/');
  assert.equal(map.get('app'), 'https://pubapi.registry.google/rdap/');
  assert.equal(map.get('ai'), 'https://rdap.identitydigital.services/rdap/');
});

test('buildRdapMap injects verified overrides for bootstrap gaps (.io)', () => {
  const map = buildRdapMap({ services: [] });
  // .io is absent from the IANA bootstrap but served by Identity Digital.
  assert.equal(map.get('io'), 'https://rdap.identitydigital.services/rdap/');
});

test('buildRdapMap tolerates a malformed bootstrap', () => {
  assert.equal(buildRdapMap({}).has('io'), true); // still has overrides, no throw
  assert.equal(buildRdapMap(null).has('io'), true);
});

// ---- classifyRdap ---------------------------------------------------------

test('classifyRdap maps authoritative HTTP status to the tri-state', () => {
  assert.equal(classifyRdap(200).status, 'registered');
  const avail = classifyRdap(404);
  assert.equal(avail.status, 'available');
  assert.match(avail.caveat, /verify at registrar/i); // never "free to grab"
  assert.equal(classifyRdap(429).status, 'unknown');
  assert.equal(classifyRdap(429).reason, 'rate-limited');
  assert.equal(classifyRdap(500).status, 'unknown'); // 5xx is never "available"
});

// ---- interpretWhois -------------------------------------------------------

test('interpretWhois reads a "no match" body as available', () => {
  assert.equal(interpretWhois('No Data Found').status, 'available');
  assert.equal(interpretWhois('NOT FOUND\n').status, 'available');
  assert.match(interpretWhois('No match for domain').caveat, /verify at registrar/i);
});

test('interpretWhois reads a populated record as registered', () => {
  const body = 'Domain Name: LUMIRA.CO\nRegistrar: Example\nCreation Date: 2019-01-01';
  assert.equal(interpretWhois(body).status, 'registered');
});

test('interpretWhois stays "unknown" on empty or unrecognized bodies', () => {
  assert.equal(interpretWhois('').status, 'unknown');
  assert.equal(interpretWhois('   ').status, 'unknown');
  assert.equal(interpretWhois('garbled registry banner with no markers').status, 'unknown');
});

// ---- parseWhoisReferral ---------------------------------------------------

test('parseWhoisReferral extracts the registry server from an IANA answer', () => {
  const iana = [
    '% IANA WHOIS server',
    'domain:        CO',
    'organisation:  .CO Internet S.A.S.',
    'whois:         whois.registry.co',
    'status:        ACTIVE',
  ].join('\n');
  assert.equal(parseWhoisReferral(iana), 'whois.registry.co');
  assert.equal(parseWhoisReferral('no whois line here'), null);
  assert.equal(parseWhoisReferral(''), null);
});

// ---- classifyRegistryStatus (github / npm) --------------------------------

test('classifyRegistryStatus treats 404 as available and 200 as taken', () => {
  assert.deepEqual(classifyRegistryStatus(404), { status: 'available', confidence: 'high' });
  assert.deepEqual(classifyRegistryStatus(200), { status: 'taken', confidence: 'high' });
  assert.equal(classifyRegistryStatus(429).status, 'unknown');
  assert.equal(classifyRegistryStatus(503).status, 'unknown');
});

// ---- parseArgs ------------------------------------------------------------

test('parseArgs reads names positionally and via --names, deduped + normalized', () => {
  const o = parseArgs(['Lumira', '--names', 'BrightStack, lumira']);
  assert.deepEqual(o.names, ['lumira', 'brightstack']);
});

test('parseArgs defaults TLDs and strips a leading dot', () => {
  assert.deepEqual(parseArgs(['x']).tlds, ['com', 'io', 'ai', 'co', 'app']);
  assert.deepEqual(parseArgs(['x', '--tlds', '.com, .io']).tlds, ['com', 'io']);
});

test('parseArgs --social with no value uses the default platform set', () => {
  assert.deepEqual(parseArgs(['x', '--social']).social, ['github', 'x', 'instagram']);
  assert.deepEqual(parseArgs(['x', '--social', 'github,npm']).social, ['github', 'npm']);
  assert.equal(parseArgs(['x']).social, null); // off by default
});

test('parseArgs reads numeric + boolean flags', () => {
  const o = parseArgs(['x', '--concurrency', '3', '--timeout', '5000', '--no-whois']);
  assert.equal(o.concurrency, 3);
  assert.equal(o.timeout, 5000);
  assert.equal(o.whois, false);
});

// ---- makeHostLimiter ------------------------------------------------------

test('makeHostLimiter caps concurrency per host and queues the overflow', async () => {
  const lim = makeHostLimiter(2);
  await lim.acquire('h');
  await lim.acquire('h'); // now at cap (2)
  let third = false;
  const p = lim.acquire('h').then(() => { third = true; });
  await tick();
  assert.equal(third, false, 'third acquire on the same host stays queued while at cap');
  lim.release('h'); // free a slot -> queued acquire proceeds
  await p;
  assert.equal(third, true);
});

test('makeHostLimiter treats hosts independently', async () => {
  const lim = makeHostLimiter(1);
  await lim.acquire('a');
  let bDone = false;
  await lim.acquire('b').then(() => { bDone = true; }); // different host, not blocked
  assert.equal(bDone, true);
});

// ---- CLI contract (offline) ----------------------------------------------

test('CLI --help prints usage and exits 0', () => {
  const out = execFileSync('node', [SCRIPT, '--help'], { encoding: 'utf8' });
  assert.match(out, /Usage: node check-availability\.mjs/);
});

test('CLI with no names exits 2 (usage error)', () => {
  assert.throws(
    () => execFileSync('node', [SCRIPT], { encoding: 'utf8', stdio: 'pipe' }),
    (err) => err.status === 2,
  );
});
