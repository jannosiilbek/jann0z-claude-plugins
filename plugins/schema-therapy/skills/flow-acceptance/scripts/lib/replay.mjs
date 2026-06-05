// replay.mjs — the walk-replay oracle (simulation.md §3.3, the HEART). Given one feature's
// ordered walk-step list (steps.mjs) + the persona's 09 model (ifml.mjs) + the 08
// nominal-leaf order (taskmodel.mjs) + the 06 tag vocabulary (tags.mjs), it REPLAYS the step
// chain against the 09 graph as a single deterministic forward pass (no search — each step
// names its exact target) and cross-references 08/06.
//
// Returns { walks:[{id, rule, status, detail}], result:{home, hops, walkedLeaves,
//   nominalLeaves, realizable, tagsBound, tagsRequired, strandedAt?, skippedAfterStrand?} }
// where walks carries V-START / V-LOC / V-EVENT / V-NAV / V-ORDER / V-COVER / V-TAG. Each
// check is recorded once per feature (pass|fail) with the catalog rule it mechanizes.
//
// STRAND-STOPS-EVALUATION (simulation.md §3.3): the forward pass is a single deterministic
// walk. The moment a chain STRANDS — a V-LOC / V-EVENT / V-NAV failure desynchronizes the
// walk from the 09 graph — every subsequent step of that chain is UNREACHABLE: the walk is no
// longer standing where the spec claims, so a later interaction's leaf realization or a later
// outcome's tag binding cannot be trusted. We therefore STOP collecting bindings/leaves past
// the strand point (recorded as `skippedAfterStrand` for transparency), so the downstream
// cross-references V-ORDER / V-COVER / V-TAG evaluate only the reachable prefix and do NOT
// co-fire on the unreachable tail. This isolates the FIRST real reason (e.g. V-LOC reports the
// ghost screen; V-TAG does not also fire on a post-strand ghost tag). Edge arithmetic: the
// skipped steps are excluded from the leaf/binding obligations exactly like the vacuous-feature
// replay skip precedent — the per-feature V-* checks are still each recorded once, but the
// post-strand elements contribute no pass/fail obligation. Determinism: §8 — pure function of
// the feature + 09 + 08 + 06 inputs.

export function replay(feature09Steps, model09, nominalLeaves08, tags06) {
  const walks = [];
  const add = (id, rule, status, detail) => walks.push({ id, rule, status, detail: detail || '' });
  // the set of 08 nominal-leaf ids — a walked interaction Event contributes to the leaf-order
  // comparison ONLY when its task= resolves to one of these (a non-domain navigation Event,
  // whose task is not an 08 nominal leaf, is part of the walk but not a leaf realization).
  const nominalLeafIdSet = new Set(nominalLeaves08.map((l) => l.id));

  // collect ordered walk classifications across all scenarios of the feature. The bijection
  // is one feature per 08 model; a feature may carry ≥1 scenario chain — we replay EACH
  // scenario chain independently but accumulate the leaf-order / coverage obligations across
  // the feature (the 08 nominal leaves are the feature-level obligation). For the canonical
  // single-chain dialect this is one chain.
  const scenarios = feature09Steps; // [[{role,text,cls}, …], …] — one array per scenario

  let firstHome = null;
  let anyStranded = null;
  const walkedLeafIds = [];      // 08 leaf ids, in walked order (via Event.task=)
  const boundTags = new Set();   // outcome-binding tags seen
  let totalHops = 0;
  let skippedAfterStrand = 0;    // steps not evaluated because their chain already stranded

  let startChecked = false;
  let locOk = true, eventOk = true, navOk = true;

  for (const chain of scenarios) {
    let current = model09.homeContainer; // initialize at home (V-START premise)
    let prevEvent = null; // the immediately-preceding interaction Event (for V-NAV)
    let sawFirstLocation = false;
    // STRAND-STOPS-EVALUATION: once this chain desyncs from the 09 graph, the steps past the
    // strand point are unreachable — we keep walking the loop only to record the strand once,
    // but we stop collecting leaf/tag obligations from the unreachable tail.
    let chainStranded = false;

    for (const step of chain) {
      const c = step.cls;
      // past the strand point: do not evaluate this step's bindings (unreachable).
      if (chainStranded) {
        if (c.kind === 'interaction' || c.kind === 'outcome') skippedAfterStrand++;
        continue;
      }
      if (c.kind === 'location') {
        // V-START: first location Given of the chain must equal home.
        if (!sawFirstLocation) {
          sawFirstLocation = true;
          if (firstHome == null) firstHome = c.screenId;
          if (!startChecked) {
            startChecked = true;
            if (c.screenId !== model09.homeContainer) {
              add('V-START', 'B-b', 'fail',
                `chain's first location Given is "${c.screenId}", not the persona's home container "${model09.homeContainer}"`);
            } else {
              add('V-START', 'B-b', 'pass');
            }
          }
          // current already initialized to home; first location must match current(=home or named).
        }
        // V-LOC: screen ∈ 09 containers AND == current.
        if (!model09.containerById.has(c.screenId)) {
          locOk = false;
          chainStranded = true;
          anyStranded = anyStranded || { step: step.text, current, missing: c.screenId, why: 'screen absent from 09' };
        } else if (c.screenId !== current) {
          // a real-but-wrong screen ⇒ walk desynchronized (B-c via V-LOC).
          locOk = false;
          chainStranded = true;
          anyStranded = anyStranded || { step: step.text, current, missing: c.screenId, why: 'walk desynchronized (location ≠ current)' };
        } else {
          current = c.screenId;
        }
      } else if (c.kind === 'interaction') {
        // V-EVENT: resolve to one Event of `current`, by the pinned disambiguation.
        const container = model09.containerById.get(current);
        let resolved = null;
        if (container) {
          if (c.form === 'quoted') {
            resolved = container.events.find((e) => e.id === c.eventId) || null;
            if (resolved && resolved.annotation01 != null) {
              // wrong form: quoted-id used for a domain-affecting Event.
              eventOk = false;
              chainStranded = true;
              anyStranded = anyStranded || { step: step.text, current, missing: c.eventId, why: 'quoted-id form used for a domain-affecting Event (must embed the 01-event string)' };
              resolved = null;
            }
          } else if (c.form === 'embedded') {
            resolved = container.events.find((e) => e.annotation01 != null && c.embedded === e.annotation01) || null;
            if (!resolved) {
              // maybe the embedded string belongs to a non-domain event ⇒ wrong form.
              const nonDom = container.events.find((e) => e.annotation01 == null);
              eventOk = false;
              chainStranded = true;
              anyStranded = anyStranded || { step: step.text, current, missing: c.embedded, why: 'embedded 01-event string matches no domain-affecting Event of the current screen' };
              void nonDom;
            }
          }
        } else {
          eventOk = false;
          chainStranded = true;
        }
        if (resolved) {
          prevEvent = resolved;
          // only Events whose task= resolves to an 08 nominal leaf count toward the leaf-order
          // comparison; non-domain navigation Events are walked but realize no leaf.
          if (resolved.task != null && nominalLeafIdSet.has(resolved.task)) walkedLeafIds.push(resolved.task);
        }
      } else if (c.kind === 'navigation') {
        // V-NAV: a 09 edge exists from prevEvent to c.screenId; advance current.
        totalHops++;
        const edge = prevEvent
          ? model09.flows.find((f) => f.fromEvent === prevEvent.id && f.toContainer === c.screenId)
          : null;
        if (!edge) {
          navOk = false;
          chainStranded = true;
          anyStranded = anyStranded || {
            step: step.text, current,
            missing: c.screenId,
            why: prevEvent
              ? `no 09 NavigationFlow from event "${prevEvent.id}" to "${c.screenId}"`
              : 'navigation Then with no preceding interaction Event',
          };
        } else if (!model09.containerById.has(c.screenId)) {
          // edge exists but its target container is absent from the model (dangling end on
          // the walked path) — handled as an upstream-defect by the harness pre-check, but
          // record here too.
          navOk = false;
          chainStranded = true;
          anyStranded = anyStranded || { step: step.text, current, missing: c.screenId, why: 'navigation target container absent from 09 (dangling edge end)' };
        } else {
          current = c.screenId;
        }
      } else if (c.kind === 'outcome') {
        boundTags.add(c.tag);
      }
    }
  }

  // V-LOC / V-EVENT / V-NAV verdicts (recorded once per feature).
  if (locOk) add('V-LOC', 'B-a', 'pass');
  else add('V-LOC', 'B-a', 'fail', anyStranded ? `${anyStranded.why}: '${anyStranded.missing}' (at step: ${anyStranded.step}; current='${anyStranded.current}')` : 'location replay failed');

  if (eventOk) add('V-EVENT', 'B-e', 'pass');
  else add('V-EVENT', 'B-e', 'fail', anyStranded ? `${anyStranded.why} (at step: ${anyStranded.step}; current='${anyStranded.current}')` : 'interaction replay failed');

  if (navOk) add('V-NAV', 'B-c', 'pass');
  else add('V-NAV', 'B-c', 'fail', anyStranded ? `${anyStranded.why} (at step: ${anyStranded.step}; current='${anyStranded.current}')` : 'navigation replay failed');

  // STRAND-STOPS-EVALUATION: when the forward pass stranded, the walk is desynchronized from
  // the 09 graph, so the leaf-order / coverage cross-references are UNASSESSABLE — the
  // walkedLeafIds tail is missing by construction, not by a real ordering/coverage defect. The
  // strand reason (V-LOC / V-EVENT / V-NAV) already owns the failure; V-ORDER / V-COVER must not
  // pile on a derivative failure. They are recorded as pass over the (empty/partial) reachable
  // prefix. (V-ORDER / V-COVER only carry an independent failure when the walk did NOT strand —
  // e.g. a clean walk whose leaves are reordered, or a clean walk with an uncovered leaf tag.)
  const stranded = !(locOk && eventOk && navOk);

  // V-ORDER: walked leaf order (via Event.task=) == 08 nominal-path leaf order, restricted to
  // the INTERACTION/USER nominal leaves. SYMMETRIC FILTER (simulation.md §3.3 note d.4):
  // the walked side is already filtered to Events whose task= resolves to an 08 nominal leaf
  // (note d.1); the nominal side must be filtered the same way — a `system`-category nominal
  // leaf imposes NO screen/Event obligation (the verified 09 contract's B-b: system leaves
  // are dropped from the realization sequence, INTERACTION_LEAF_CATEGORIES = {interaction,
  // user}), so no 09 Event is REQUIRED to realize it, so it MUST NOT enter the leaf-order
  // comparison. Without this filter, any real 08 model carrying a system leaf on its nominal
  // path is unwalkable (the walk can never realize a leaf the 09 contract forbids realizing).
  // Excluded system leaves are reported as `systemLeavesExcluded` for transparency.
  const isWalkableLeaf = (l) => l.category === 'interaction' || l.category === 'user';
  const nominalIds = nominalLeaves08.filter(isWalkableLeaf).map((l) => l.id);
  const systemLeavesExcluded = nominalLeaves08.filter((l) => !isWalkableLeaf(l)).map((l) => l.id);
  const orderOk = stranded || arraysEqual(walkedLeafIds, nominalIds);
  if (orderOk) add('V-ORDER', 'B-d', 'pass', stranded ? 'walk stranded — leaf order unassessable (owned by the strand reason)' : '');
  else add('V-ORDER', 'B-d', 'fail',
    `walked leaf order [${walkedLeafIds.join(', ')}] ≠ 08 nominal-path interaction/user leaf order [${nominalIds.join(', ')}]`);

  // V-COVER: every walked 08 leaf's scenario-tag covered by ≥1 outcome binding.
  // Determine which nominal leaves were walked (by id), then their tag obligations.
  const walkedSet = new Set(walkedLeafIds);
  const requiredTags = [];
  for (const leaf of nominalLeaves08) {
    if (!walkedSet.has(leaf.id)) continue;
    for (const tag of leaf.scenarioTags) requiredTags.push({ leaf: leaf.id, tag });
  }
  const uncovered = requiredTags.filter((rt) => !boundTags.has(rt.tag));
  if (uncovered.length === 0) add('V-COVER', 'C-b', 'pass');
  else add('V-COVER', 'C-b', 'fail',
    `walked 08 leaf scenario-tag(s) with no outcome binding: ${uncovered.map((u) => `${u.tag} (leaf ${u.leaf})`).join(', ')}`);

  // V-TAG: each outcome binding's tag ∈ tags06 (resolves) AND within the closed grammar.
  // (closed-grammar membership is enforced by tags06 being built only from legal tags? no —
  // tags06 is the raw 06 set; we check membership here; grammar is checked at the mechanical
  // R-level. A binding tag absent from 06 is the C-a finding.)
  const ghost = [...boundTags].filter((t) => !tags06.has(t)).sort();
  if (ghost.length === 0) add('V-TAG', 'C-a', 'pass');
  else add('V-TAG', 'C-a', 'fail', `outcome binding tag(s) resolve nowhere in 06: ${ghost.join(', ')}`);

  const realizable = locOk && eventOk && navOk && orderOk;
  return {
    walks,
    result: {
      home: firstHome != null ? firstHome : model09.homeContainer,
      hops: totalHops,
      walkedLeaves: walkedLeafIds.length,
      nominalLeaves: nominalIds.length,
      systemLeavesExcluded,
      realizable,
      tagsBound: boundTags.size,
      tagsRequired: new Set(requiredTags.map((r) => r.tag)).size,
      strandedAt: anyStranded ? anyStranded.step : null,
      skippedAfterStrand,
    },
  };
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
