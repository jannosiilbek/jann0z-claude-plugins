#!/usr/bin/env node
// ---------------------------------------------------------------------------
// check-availability.mjs — domain + social-handle availability checker
//
// Used by the lunchbox `brand-namer` skill. Given a list of candidate brand
// labels, it reports — per candidate — whether the domain is taken on each
// TLD and whether the social handle is free, using only public sources and
// zero third-party dependencies (Node >= 18, global fetch + builtins).
//
// HONESTY CONTRACT
//   Every domain result is a TRI-STATE, never a bare boolean:
//     registered  — proven taken (authoritative RDAP 200, DNS delegation, or WHOIS match)
//     available   — proven free  (authoritative RDAP 404 or WHOIS "no match")
//     unknown     — could not prove either way (rate-limited, no RDAP+no WHOIS, timeout)
//   "available" is always tagged with a caveat: an unregistered name may still
//   be premium/reserved priced — confirm at a registrar. We never say "free to grab".
//
// HOW IT DECIDES (layered, cheapest-first, per domain)
//   1. RDAP (authoritative) — resolve the TLD's RDAP server from the IANA
//      bootstrap (https://data.iana.org/rdap/dns.json, cached ~24h) plus a small
//      verified override map for bootstrap gaps (e.g. .io). HTTP 200=registered,
//      404=available, 429/5xx/timeout=unknown. A 404 is only trusted from the
//      TLD's *authoritative* server — never from an aggregator. RDAP requests are
//      throttled per-host (so checking many .io+.ai names, which share one
//      registry, doesn't trip 429) and retry once honoring Retry-After.
//   2. DNS (node:dns) — NS/SOA present => definitively registered (works for any
//      TLD, cheap). Absence is NOT proof of available (parked / undelegated).
//   3. WHOIS (port 43, node:net) — last resort for TLDs without RDAP (e.g. .co)
//      to turn a "no DNS delegation" into a confident available/registered.
//
// SOCIAL HANDLES (opt-in via --social)
//   github  — api.github.com/users/<h>: 404 available, 200 taken (high confidence)
//   npm     — registry.npmjs.org/<h>:    404 available, 200 taken (high confidence)
//   x / instagram — best-effort GET of the public profile URL. These sites gate
//   bots behind login walls, so results are usually "unknown" + a URL to eyeball.
//   We report low confidence rather than guessing.
//
// USAGE
//   node check-availability.mjs --names "lumira,brightstack,nimbo"
//   node check-availability.mjs lumira brightstack --tlds com,io,ai,co,app
//   node check-availability.mjs --names "lumira" --social github,x,instagram
//   node check-availability.mjs --names "lumira" --social        (defaults github,x,instagram)
//
// FLAGS
//   --names a,b,c     comma-separated candidate labels (or pass them positionally)
//   --tlds  ...       comma-separated TLDs (default: com,io,ai,co,app)
//   --social [...]    check social handles; optional value list (default: github,x,instagram)
//   --concurrency N   max in-flight network checks (default: 6)
//   --timeout MS      per-request timeout (default: 8000)
//   --no-whois        disable the WHOIS fallback layer
//   --help            print this usage and exit
//
// OUTPUT  pretty-printed JSON on stdout: { checkedAt, tlds, results: [...] }.
// EXIT CODES  0 = ran to completion (look at per-item status), 2 = bad usage.
// ---------------------------------------------------------------------------

import { Resolver } from 'node:dns/promises';
import net from 'node:net';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BOOTSTRAP_URL = 'https://data.iana.org/rdap/dns.json';
const BOOTSTRAP_CACHE = join(tmpdir(), 'brand-namer-rdap-bootstrap.json');
const BOOTSTRAP_TTL_MS = 24 * 60 * 60 * 1000;
const USER_AGENT = 'lunchbox-brand-namer/1.0 (domain availability check)';
const DEFAULT_TLDS = ['com', 'io', 'ai', 'co', 'app'];
const DEFAULT_SOCIAL = ['github', 'x', 'instagram'];

// Verified bootstrap gaps: TLDs served by an RDAP server that the IANA bootstrap
// does not (yet) list. Re-verify periodically. .io is the classic example.
const RDAP_OVERRIDE = new Map([
  ['io', 'https://rdap.identitydigital.services/rdap/'],
]);

// --------------------------------------------------------------------------
// Pure helpers (exported for the selftest — no network, deterministic)
// --------------------------------------------------------------------------

// Reduce a free-text candidate to a DNS/handle-safe label: lowercase, trim,
// drop anything that isn't [a-z0-9-]. "Bright Stack!" -> "brightstack".
export function normalizeName(raw) {
  return String(raw)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '');
}

// Split a comma/space separated list into clean lowercase tokens.
export function parseList(raw) {
  if (raw == null) return [];
  return String(raw)
    .split(/[,\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// The registry suffix of a domain: "lumira.co.uk" -> "uk", "lumira.com" -> "com".
export function tldOf(domain) {
  const i = domain.lastIndexOf('.');
  return i === -1 ? '' : domain.slice(i + 1);
}

// Turn the IANA bootstrap JSON into a TLD -> RDAP-base-URL map, then layer the
// verified overrides on top. Base URLs are normalized to end in a single "/".
export function buildRdapMap(bootstrapJson) {
  const map = new Map();
  const services = bootstrapJson && Array.isArray(bootstrapJson.services) ? bootstrapJson.services : [];
  for (const entry of services) {
    const tlds = entry?.[0] ?? [];
    const url = entry?.[1]?.[0];
    if (!url) continue;
    const base = url.replace(/\/?$/, '/');
    for (const t of tlds) map.set(String(t).toLowerCase(), base);
  }
  for (const [t, url] of RDAP_OVERRIDE) map.set(t, url);
  return map;
}

// Interpret an RDAP HTTP status from the *authoritative* server.
export function classifyRdap(httpStatus) {
  if (httpStatus === 200) return { status: 'registered', http: 200 };
  if (httpStatus === 404) {
    return { status: 'available', http: 404, caveat: 'verify at registrar — premium/reserved pricing may apply' };
  }
  if (httpStatus === 429) return { status: 'unknown', http: 429, reason: 'rate-limited' };
  return { status: 'unknown', http: httpStatus, reason: 'non-decisive status' };
}

// Interpret a raw WHOIS port-43 response body into a tri-state.
// Different registries word "no match" differently, so we match a broad set of
// markers and only assert when confident; otherwise "unknown".
const WHOIS_FREE = [
  /no match/i,
  /not found/i,
  /no data found/i,
  /no entries found/i,
  /domain not found/i,
  /status:\s*free/i,
  /status:\s*available/i,
  /is available for/i,
];
const WHOIS_TAKEN = [
  /domain name:/i,
  /registry domain id/i,
  /creation date/i,
  /created(?:\s+on)?:/i,
  /registrar:/i,
  /name server/i,
  /status:\s*(active|connect|ok|client)/i,
];
export function interpretWhois(responseText) {
  const text = String(responseText || '');
  if (!text.trim()) return { status: 'unknown', reason: 'empty whois response' };
  if (WHOIS_FREE.some((re) => re.test(text))) return { status: 'available', caveat: 'verify at registrar — premium/reserved pricing may apply' };
  if (WHOIS_TAKEN.some((re) => re.test(text))) return { status: 'registered' };
  return { status: 'unknown', reason: 'unrecognized whois response' };
}

// Extract the referred WHOIS server from an IANA `whois.iana.org <tld>` answer.
// IANA returns a `whois:` line naming the registry's authoritative server.
export function parseWhoisReferral(ianaResponse) {
  const m = String(ianaResponse || '').match(/^\s*whois:\s*(\S+)\s*$/im);
  return m ? m[1].trim().toLowerCase() : null;
}

// api.github.com / registry.npmjs.org both use 404=free, 200=taken cleanly.
export function classifyRegistryStatus(httpStatus) {
  if (httpStatus === 404) return { status: 'available', confidence: 'high' };
  if (httpStatus === 200) return { status: 'taken', confidence: 'high' };
  if (httpStatus === 429) return { status: 'unknown', confidence: 'low', reason: 'rate-limited' };
  return { status: 'unknown', confidence: 'low', reason: `http ${httpStatus}` };
}

// Parse argv into an options object. Pure + total so the selftest can drive it.
export function parseArgs(argv) {
  const opts = {
    names: [],
    tlds: [...DEFAULT_TLDS],
    social: null, // null = off; array = platforms to check
    concurrency: 6,
    timeout: 8000,
    whois: true,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--no-whois') opts.whois = false;
    else if (a === '--names') opts.names.push(...parseList(argv[++i]));
    else if (a === '--tlds') opts.tlds = parseList(argv[++i]).map((t) => t.replace(/^\./, ''));
    else if (a === '--concurrency') opts.concurrency = Math.max(1, parseInt(argv[++i], 10) || 6);
    else if (a === '--timeout') opts.timeout = Math.max(1000, parseInt(argv[++i], 10) || 8000);
    else if (a === '--social') {
      // value is optional: "--social" alone means the default set
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        opts.social = parseList(argv[++i]);
      } else {
        opts.social = [...DEFAULT_SOCIAL];
      }
    } else if (a.startsWith('-')) {
      // unknown flag — ignore rather than crash
    } else {
      opts.names.push(...parseList(a));
    }
  }
  opts.names = [...new Set(opts.names.map(normalizeName).filter(Boolean))];
  return opts;
}

// Per-host concurrency gate. Registry RDAP servers are shared infrastructure and
// 429 on burst; capping in-flight requests per host keeps many same-registry
// lookups (e.g. .io and .ai both on Identity Digital) from hammering one server.
export function makeHostLimiter(maxPerHost) {
  const inflight = new Map(); // host -> active count
  const waiters = new Map();  // host -> [resolve, ...]
  return {
    async acquire(host) {
      const n = inflight.get(host) || 0;
      if (n < maxPerHost) { inflight.set(host, n + 1); return; }
      await new Promise((resolve) => {
        if (!waiters.has(host)) waiters.set(host, []);
        waiters.get(host).push(resolve);
      });
      inflight.set(host, (inflight.get(host) || 0) + 1);
    },
    release(host) {
      inflight.set(host, Math.max(0, (inflight.get(host) || 1) - 1));
      const q = waiters.get(host);
      if (q && q.length) q.shift()();
    },
  };
}

// --------------------------------------------------------------------------
// Network layers (only run when invoked as a CLI)
// --------------------------------------------------------------------------

const dns = new Resolver({ timeout: 3000, tries: 1 });
dns.setServers(['1.1.1.1', '8.8.8.8']);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// At most 2 concurrent RDAP requests to any single registry host.
const rdapLimiter = makeHostLimiter(2);

async function loadBootstrap() {
  // Serve from a fresh disk cache when possible to spare IANA per-run fetches.
  try {
    const age = Date.now() - statSync(BOOTSTRAP_CACHE).mtimeMs;
    if (age < BOOTSTRAP_TTL_MS) {
      return buildRdapMap(JSON.parse(readFileSync(BOOTSTRAP_CACHE, 'utf8')));
    }
  } catch { /* no cache yet */ }

  try {
    const res = await fetch(BOOTSTRAP_URL, { headers: { 'user-agent': USER_AGENT } });
    const json = await res.json();
    try { writeFileSync(BOOTSTRAP_CACHE, JSON.stringify(json)); } catch { /* tmp not writable */ }
    return buildRdapMap(json);
  } catch {
    // Network down / IANA unreachable: fall back to overrides + DNS + WHOIS only.
    return buildRdapMap({ services: [] });
  }
}

async function fetchWithTimeout(url, { timeout, headers } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout ?? 8000);
  try {
    return await fetch(url, { headers, signal: ctrl.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

async function rdapCheck(domain, base, timeout) {
  let host;
  try { host = new URL(base).host; } catch { host = base; }
  await rdapLimiter.acquire(host);
  try {
    const url = base + 'domain/' + encodeURIComponent(domain);
    const headers = { 'user-agent': USER_AGENT, accept: 'application/rdap+json' };
    // One retry on 429, honoring Retry-After (capped) before giving up to "unknown".
    for (let attempt = 0; attempt < 2; attempt++) {
      let res;
      try {
        res = await fetchWithTimeout(url, { timeout, headers });
      } catch (e) {
        return { status: 'unknown', source: 'rdap', reason: e.name === 'AbortError' ? 'timeout' : (e.code || e.message) };
      }
      if (res.status === 429 && attempt === 0) {
        const ra = parseInt(res.headers.get('retry-after'), 10);
        await sleep(Math.min(Number.isFinite(ra) ? ra * 1000 : 1500, 5000));
        continue;
      }
      return { ...classifyRdap(res.status), source: 'rdap' };
    }
    return { status: 'unknown', source: 'rdap', http: 429, reason: 'rate-limited' };
  } finally {
    rdapLimiter.release(host);
  }
}

async function dnsRegistered(domain) {
  try { const ns = await dns.resolveNs(domain); if (ns?.length) return true; } catch { /* no NS */ }
  try { if (await dns.resolveSoa(domain)) return true; } catch { /* no SOA */ }
  return false;
}

function whoisQuery(server, query, timeout) {
  return new Promise((resolve) => {
    const socket = net.createConnection(43, server);
    let data = '';
    const done = (text) => { try { socket.destroy(); } catch {} resolve(text); };
    socket.setTimeout(timeout);
    socket.on('connect', () => socket.write(query + '\r\n'));
    socket.on('data', (chunk) => { data += chunk.toString('utf8'); });
    socket.on('end', () => done(data));
    socket.on('timeout', () => done(data));
    socket.on('error', () => done(data));
  });
}

// Verified registry WHOIS servers whose name doesn't follow whois.nic.<tld>.
// Avoids an IANA round-trip for the common cases; the referral lookup covers
// everything else.
const KNOWN_WHOIS = new Map([
  ['co', 'whois.registry.co'],
]);
const whoisServerCache = new Map();

async function whoisServerForTld(tld, timeout) {
  if (KNOWN_WHOIS.has(tld)) return KNOWN_WHOIS.get(tld);
  if (whoisServerCache.has(tld)) return whoisServerCache.get(tld);
  const referral = await whoisQuery('whois.iana.org', tld, Math.min(timeout, 5000));
  const server = parseWhoisReferral(referral);
  whoisServerCache.set(tld, server);
  return server;
}

async function whoisCheck(domain, timeout) {
  const tld = tldOf(domain);
  const server = await whoisServerForTld(tld, timeout);
  if (!server) return { status: 'unknown', source: 'whois', reason: `no whois server for .${tld}` };
  const body = await whoisQuery(server, domain, Math.min(timeout, 6000));
  return { ...interpretWhois(body), source: 'whois' };
}

// One domain, layered: RDAP -> DNS -> (WHOIS).
async function checkDomain(domain, rdapMap, opts) {
  const tld = tldOf(domain);
  const base = rdapMap.get(tld);

  if (base) {
    const r = await rdapCheck(domain, base, opts.timeout);
    if (r.status !== 'unknown') return { domain, ...r };
    // RDAP inconclusive — DNS can still prove "registered".
    if (await dnsRegistered(domain)) {
      return { domain, status: 'registered', source: 'dns-after-rdap', note: r.reason };
    }
    return { domain, status: 'unknown', source: 'rdap', reason: r.reason };
  }

  // No RDAP for this TLD: DNS proves "registered"; otherwise try WHOIS for a
  // confident answer; if WHOIS is off/inconclusive, stay honest with "unknown".
  if (await dnsRegistered(domain)) {
    return { domain, status: 'registered', source: 'dns', note: `no RDAP for .${tld}` };
  }
  if (opts.whois) {
    const w = await whoisCheck(domain, opts.timeout);
    if (w.status !== 'unknown') return { domain, ...w, note: `no RDAP for .${tld}` };
  }
  return { domain, status: 'unknown', source: 'dns', reason: `no NS/SOA and no decisive WHOIS for .${tld}` };
}

async function checkGithub(handle, timeout) {
  try {
    const res = await fetchWithTimeout(`https://api.github.com/users/${encodeURIComponent(handle)}`, {
      timeout,
      headers: { 'user-agent': USER_AGENT, accept: 'application/vnd.github+json' },
    });
    return { platform: 'github', handle, ...classifyRegistryStatus(res.status), source: 'github-api', url: `https://github.com/${handle}` };
  } catch (e) {
    return { platform: 'github', handle, status: 'unknown', confidence: 'low', source: 'github-api', reason: e.name === 'AbortError' ? 'timeout' : (e.code || e.message), url: `https://github.com/${handle}` };
  }
}

async function checkNpm(handle, timeout) {
  try {
    const res = await fetchWithTimeout(`https://registry.npmjs.org/${encodeURIComponent(handle)}`, {
      timeout,
      headers: { 'user-agent': USER_AGENT },
    });
    return { platform: 'npm', handle, ...classifyRegistryStatus(res.status), source: 'npm-registry', url: `https://www.npmjs.com/package/${handle}` };
  } catch (e) {
    return { platform: 'npm', handle, status: 'unknown', confidence: 'low', source: 'npm-registry', reason: e.name === 'AbortError' ? 'timeout' : (e.code || e.message), url: `https://www.npmjs.com/package/${handle}` };
  }
}

// x / instagram: bot-gated. We attempt a fetch but report low confidence and a
// URL to verify by hand rather than asserting a likely-wrong answer.
async function checkGatedSocial(platform, handle, timeout) {
  const url = platform === 'x'
    ? `https://x.com/${handle}`
    : `https://www.instagram.com/${handle}/`;
  try {
    const res = await fetchWithTimeout(url, { timeout, headers: { 'user-agent': 'Mozilla/5.0 (compatible; lunchbox-brand-namer/1.0)' } });
    if (res.status === 404) return { platform, handle, status: 'available', confidence: 'low', source: 'http', http: 404, url, note: 'verify manually — these sites gate bots' };
    if (res.status === 200) return { platform, handle, status: 'taken', confidence: 'low', source: 'http', http: 200, url, note: 'login wall may mask the real state — verify manually' };
    return { platform, handle, status: 'unknown', confidence: 'low', source: 'http', http: res.status, url, note: 'verify manually' };
  } catch (e) {
    return { platform, handle, status: 'unknown', confidence: 'low', source: 'http', url, reason: e.name === 'AbortError' ? 'timeout' : (e.code || e.message), note: 'verify manually' };
  }
}

function checkSocial(platform, handle, timeout) {
  if (platform === 'github') return checkGithub(handle, timeout);
  if (platform === 'npm') return checkNpm(handle, timeout);
  if (platform === 'x' || platform === 'twitter') return checkGatedSocial('x', handle, timeout);
  if (platform === 'instagram' || platform === 'ig') return checkGatedSocial('instagram', handle, timeout);
  return Promise.resolve({ platform, handle, status: 'unknown', confidence: 'low', note: `unsupported platform "${platform}"` });
}

// Bounded-concurrency worker pool — no dependencies, preserves input order.
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length || 1) }, async () => {
      while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
    })
  );
  return out;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help || opts.names.length === 0) {
    const usage = [
      'Usage: node check-availability.mjs --names "a,b,c" [--tlds com,io,ai,co,app] [--social [github,x,instagram]]',
      '       node check-availability.mjs a b c --tlds com,io',
      '',
      'Flags: --names --tlds --social --concurrency N --timeout MS --no-whois --help',
      'Output: JSON { checkedAt, tlds, results:[ { name, domains:[...], social:[...] } ] }',
    ].join('\n');
    process.stdout.write(usage + '\n');
    process.exit(opts.help ? 0 : 2);
  }

  const rdapMap = await loadBootstrap();

  // Flatten every (name × tld) domain and (name × platform) handle into one
  // work list so the concurrency pool keeps the network busy across candidates.
  const domainJobs = [];
  for (const name of opts.names) {
    for (const tld of opts.tlds) domainJobs.push({ name, domain: `${name}.${tld}` });
  }
  const domainResults = await pool(domainJobs, opts.concurrency, async (job) => ({
    name: job.name,
    ...(await checkDomain(job.domain, rdapMap, opts)),
  }));

  let socialResults = [];
  if (opts.social) {
    const socialJobs = [];
    for (const name of opts.names) {
      for (const platform of opts.social) socialJobs.push({ name, platform });
    }
    socialResults = await pool(socialJobs, opts.concurrency, async (job) => ({
      name: job.name,
      ...(await checkSocial(job.platform, job.name, opts.timeout)),
    }));
  }

  const results = opts.names.map((name) => ({
    name,
    domains: domainResults.filter((d) => d.name === name).map(({ name: _n, ...rest }) => rest),
    social: socialResults.filter((s) => s.name === name).map(({ name: _n, ...rest }) => rest),
  }));

  process.stdout.write(JSON.stringify({ checkedAt: new Date().toISOString(), tlds: opts.tlds, results }, null, 2) + '\n');
}

// Run main only when executed directly, so the selftest can import the pure
// helpers above without triggering any network activity.
const invokedDirectly = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
