// graph.mjs — the vendored, dependency-free NAVIGATION FLOW-WALKER: the strongest-oracle
// layer (simulation.md §1/§3.3). The probe proved no IFML execution engine is pinnable, so
// the harness WALKS the NavigationFlow graph rather than trusting a declared number. Per
// realized 08 model it asserts:
//   W-HOME    — exactly one home container AND every realized container reachable from home;
//   W-REALIZE — a navigation path from home realizes the ordered interaction/user nominal-leaf
//               sequence's mapped Events in order (BFS shortest hop-count, document-order
//               tie-break) — B-d;
//   W-COST    — the RE-COMPUTED flow_cost (Σ nominal event-klm instances + BB×(hops−1)) vs the
//               realized 08 Budget.klm; BOTH values + the contributing path reported — C-a.
//               ⚠️ WARN-ONLY: the budget is the 08 model's own declared ceiling (derived from its
//               own decomposition, measuring nothing external), so exceeding it is surfaced for
//               agent judgment, never a gate failure;
//   W-BLOAT   — screens visited on the realizing walk (home + one per hop) ≤ the realized 08
//               model's nominal leaf count + 3 — C-d. ❌ BLOCKING: this is the real flow-bloat
//               floor — a flow that drags the user through gratuitous screens fails simulation.
//
// Every walked value is a PURE FUNCTION of the model + its 08 nominal path (pinned nominal
// rule + pinned BFS-shortest/doc-order tie-break + pinned klm tokenizer + NAV_HOP_COST = BB =
// 1 token) ⇒ byte-deterministic (simulation.md §8). Cost is denominated in the 08-owned KLM
// operator-TOKEN unit (BB = 1 token), so a 09 flow cost is directly comparable to an 08
// Budget. The walker NEVER trusts the declared budget; it re-derives the integer and compares.

import { klmInstanceCount, NAV_HOP_COST, INTERACTION_LEAF_CATEGORIES } from './lexicon.mjs';

// buildGraph(model) → { containers: Map(id→container), homeIds:[id],
//   eventById: Map(eventId→{event, containerId}), targetOf: Map(eventId→toContainerId) }.
export function buildGraph(model) {
  const containers = new Map();
  for (const c of model.containers) if (c.id != null) containers.set(c.id, c);
  const homeIds = model.containers.filter((c) => c.home).map((c) => c.id);
  const eventById = new Map();
  for (const c of model.containers) {
    for (const e of c.events) if (e.id != null) eventById.set(e.id, { event: e, containerId: c.id });
  }
  const targetOf = new Map();
  for (const f of model.flows) if (f.from != null && f.to != null) targetOf.set(f.from, f.to);
  return { containers, homeIds, eventById, targetOf };
}

// reachableContainers(graph, homeId) → Set of container ids reachable from home by firing any
// event with a NavigationFlow (BFS over the directed container graph).
export function reachableContainers(graph, homeId) {
  const reached = new Set();
  if (homeId == null) return reached;
  const q = [homeId];
  reached.add(homeId);
  while (q.length) {
    const cur = q.shift();
    const container = graph.containers.get(cur);
    if (!container) continue;
    for (const e of container.events) {
      const to = graph.targetOf.get(e.id);
      if (to != null && graph.containers.has(to) && !reached.has(to)) { reached.add(to); q.push(to); }
    }
  }
  return reached;
}

// resolveLeafEvents(model, nominalLeaves) → for each interaction/user leaf, the list of Event
// ids whose `task=` equals the leaf id (document order). System leaves impose no obligation
// (B-b) and are dropped from the realization sequence. Returns
// { sequence:[{leafId, eventIds:[id]}], unmappedLeaves:[leafId] }.
export function resolveLeafEvents(model, nominalLeaves) {
  const byTask = new Map();
  for (const e of model.events) {
    if (e.task == null) continue;
    if (!byTask.has(e.task)) byTask.set(e.task, []);
    byTask.get(e.task).push(e.id);
  }
  const sequence = [];
  const unmappedLeaves = [];
  for (const leaf of nominalLeaves) {
    if (!INTERACTION_LEAF_CATEGORIES.has(leaf.category)) continue; // system: no obligation
    const eventIds = byTask.get(leaf.id) || [];
    if (eventIds.length === 0) { unmappedLeaves.push(leaf.id); continue; }
    sequence.push({ leafId: leaf.id, eventIds });
  }
  return { sequence, unmappedLeaves };
}

// realize(graph, homeId, sequence) — the BFS-shortest realizing walk. State = (container,
// nextIndex). From a container the walker may FIRE any event declared there: firing the
// mapped event of `nextIndex` advances the index (and, if the event has a navflow, moves
// container); firing any other navflow-bearing event repositions without advancing. We seek
// the fewest container HOPS to reach nextIndex === sequence.length.
//
// Returns { ok, hops, firedEvents:[eventId] (the leaf-mapped events fired, in order),
//   strandedAt:{leafId, index}|null, detail }.
export function realize(graph, homeId, sequence) {
  if (homeId == null) return { ok: false, hops: 0, firedEvents: [], strandedAt: null, detail: 'no home container' };
  if (sequence.length === 0) return { ok: true, hops: 0, firedEvents: [], strandedAt: null, detail: '' };

  // BFS over states keyed `container||index`. Each state records {hops, firedEvents, container,
  // index}. Document-order tie-break: events are iterated in container-declaration order and
  // the BFS queue is FIFO, so the first path found at the minimal hop count is doc-order-first.
  const start = { container: homeId, index: 0, hops: 0, fired: [] };
  const seen = new Set([`${homeId}||0`]);
  const q = [start];
  let bestStranded = { leafId: sequence[0].leafId, index: 0 };

  while (q.length) {
    const st = q.shift();
    if (st.index === sequence.length) {
      return { ok: true, hops: st.hops, firedEvents: st.fired, strandedAt: null, detail: '' };
    }
    if (st.index > bestStranded.index) bestStranded = { leafId: sequence[st.index].leafId, index: st.index };
    const container = graph.containers.get(st.container);
    if (!container) continue;
    const wantIds = new Set(sequence[st.index].eventIds);

    for (const e of container.events) {
      const to = graph.targetOf.get(e.id);
      const isMapped = wantIds.has(e.id);
      // Option A: fire this as the mapped event for the current leaf (advance index).
      if (isMapped) {
        const nextContainer = to != null ? to : st.container;
        const nextIndex = st.index + 1;
        const hops = to != null ? st.hops + 1 : st.hops;
        const key = `${nextContainer}||${nextIndex}`;
        if (!seen.has(key)) {
          seen.add(key);
          q.push({ container: nextContainer, index: nextIndex, hops, fired: [...st.fired, e.id] });
        }
      }
      // Option B: fire this as a pure repositioning navigation (no index advance) — only if it
      // actually moves us (has a navflow), to avoid stalling in place.
      if (to != null) {
        const key = `${to}||${st.index}`;
        if (!seen.has(key)) {
          seen.add(key);
          q.push({ container: to, index: st.index, hops: st.hops + 1, fired: st.fired.slice() });
        }
      }
    }
  }
  return { ok: false, hops: 0, firedEvents: [], strandedAt: bestStranded,
    detail: `nominal walk stranded at leaf '${bestStranded.leafId}' (index ${bestStranded.index}): no navigation path from home fires the remaining mapped events in order` };
}

// cost(graph, firedEvents, hops) → { ok, computed, contributing:[{id, klm, instances}], detail }.
// computed = Σ klm-token-count of the leaf-mapped events fired + NAV_HOP_COST × (hops − 1)
// (first/home container free; NAV_HOP_COST = BB = 1 token, the 08-owned unit). Uses the same
// greedy tokenizer M-KLM validated.
export function cost(graph, firedEvents, hops) {
  const contributing = [];
  let computed = 0;
  for (const id of firedEvents) {
    const entry = graph.eventById.get(id);
    const klm = entry ? entry.event.klm : null;
    const c = klmInstanceCount(klm);
    if (!c.ok) return { ok: false, computed: 0, contributing, detail: `event '${id}' has an illegal klm ('${klm}'): ${c.detail}` };
    computed += c.count;
    contributing.push({ id, klm, instances: c.count });
  }
  const navOverhead = hops > 0 ? NAV_HOP_COST * (hops - 1) : 0;
  computed += navOverhead;
  return { ok: true, computed, navOverhead, hops, contributing, detail: '' };
}

// runWalks(model, taskModel08) → the full per-realized-model walk result.
// { walks:[{id, rule, status, detail}], realizable, hops, computedCost, budget,
//   nominalLeaves, contributing, reachableCount, unreachable:[id] }.
export function runWalks(model, taskModel08) {
  const walks = [];
  const add = (id, rule, status, detail) => walks.push({ id, rule, status, detail: detail || '' });
  const graph = buildGraph(model);

  // --- W-HOME: exactly one home + all realized containers reachable.
  let homeId = null;
  if (graph.homeIds.length === 1) {
    homeId = graph.homeIds[0];
  }
  const reachable = homeId != null ? reachableContainers(graph, homeId) : new Set();
  const allContainerIds = model.containers.map((c) => c.id).filter((x) => x != null);
  const unreachable = allContainerIds.filter((id) => !reachable.has(id));
  if (graph.homeIds.length !== 1) {
    add('W-HOME', 'A-l', 'fail', `expected exactly one home="true" container, found ${graph.homeIds.length}`);
  } else if (unreachable.length) {
    add('W-HOME', 'A-l', 'fail', `container(s) unreachable from home '${homeId}': ${unreachable.join(', ')}`);
  } else {
    add('W-HOME', 'A-l', 'pass');
  }

  // --- W-REALIZE: nominal leaf sequence walkable from home.
  const { sequence, unmappedLeaves } = resolveLeafEvents(model, taskModel08.nominalLeaves);
  let realResult = { ok: false, hops: 0, firedEvents: [], strandedAt: null, detail: '' };
  if (unmappedLeaves.length) {
    add('W-REALIZE', 'B-d', 'fail',
      `interaction/user nominal leaf(es) with no mapped Event (task=) ⇒ nominal path not realizable: ${unmappedLeaves.join(', ')}`);
  } else if (homeId == null) {
    add('W-REALIZE', 'B-d', 'fail', 'no unique home container to start the realizing walk');
  } else {
    realResult = realize(graph, homeId, sequence);
    if (realResult.ok) add('W-REALIZE', 'B-d', 'pass');
    else add('W-REALIZE', 'B-d', 'fail', realResult.detail);
  }

  // --- W-COST (⚠️ warn-only): re-computed flow cost vs the 08 budget. The budget is the 08
  // model's own declared ceiling (a number derived from its own decomposition — W-BUDGET in 08
  // already guards its honesty), so exceeding it here is agent-review residue, never a gate
  // failure. The blocking flow-bloat floor is W-BLOAT below.
  let computedCost = null, costResult = null;
  if (realResult.ok) {
    costResult = cost(graph, realResult.firedEvents, realResult.hops);
    if (!costResult.ok) {
      add('W-COST', 'C-a', 'warn', costResult.detail);
    } else {
      computedCost = costResult.computed;
      const budget = taskModel08.declaredBudget;
      if (budget == null) {
        add('W-COST', 'C-a', 'warn', `08 Budget.klm is not a non-negative integer; computed cost=${computedCost}`);
      } else if (computedCost > budget) {
        add('W-COST', 'C-a', 'warn',
          `flow_cost ${computedCost} > Budget.klm ${budget} for ${taskModel08.stem} ` +
          `(events [${costResult.contributing.map((c) => `${c.id} ${c.klm}=${c.instances}`).join(', ')}] ` +
          `+ BB×(${realResult.hops}-1)=${costResult.navOverhead}); re-model 09 to cut hops/clicks`);
      } else {
        add('W-COST', 'C-a', 'pass');
      }
    }
  } else {
    add('W-COST', 'C-a', 'warn', 'flow not realizable ⇒ cost cannot be walked');
  }

  // --- W-BLOAT (❌): screens visited on the realizing walk ≤ 08 nominal leaf count + 3.
  // screens = home + one per hop (revisits counted — each hop drags the user through a screen).
  // The ceiling is external to 09: the 08 nominal leaf count is the job's own step count, so a
  // tight flow needs at most ~one screen per step; +3 grants home/landing slack.
  const screens = realResult.ok ? realResult.hops + 1 : null;
  const bloatLimit = taskModel08.nominalLeaves.length + 3;
  if (!realResult.ok) {
    add('W-BLOAT', 'C-d', 'fail', 'flow not realizable ⇒ screens visited cannot be walked');
  } else if (screens > bloatLimit) {
    add('W-BLOAT', 'C-d', 'fail',
      `screens visited ${screens} > nominal leaf count ${taskModel08.nominalLeaves.length} + 3 = ${bloatLimit} ` +
      `for ${taskModel08.stem} (home + ${realResult.hops} hops); cut gratuitous intermediate screens`);
  } else {
    add('W-BLOAT', 'C-d', 'pass');
  }

  return {
    walks, realizable: realResult.ok, hops: realResult.hops,
    computedCost, budget: taskModel08.declaredBudget,
    screens, bloatLimit,
    nominalLeaves: taskModel08.nominalLeaves.length,
    contributing: costResult ? costResult.contributing : [],
    reachableCount: reachable.size,
    unreachable,
  };
}
