// @ts-nocheck — workflow script: top-level return and await are valid in the Workflow tool runtime
export const meta = {
  name: 'council',
  description: 'Six-expert parallel code review: architecture, DRY, clarity, SOLID, project alignment, semantic alignment',
  phases: [
    { title: 'Expert Review' },
    { title: 'Synthesis' }
  ]
}

const FINDING_SCHEMA = {
  type: 'object',
  properties: {
    location: { type: 'string', description: 'file path, line number, or function/class name' },
    issue: { type: 'string', description: 'what is wrong, stated precisely' },
    why_it_matters: { type: 'string', description: 'consequence if left unaddressed' },
    suggestion: { type: 'string', description: 'concrete actionable fix' }
  },
  required: ['location', 'issue', 'why_it_matters', 'suggestion']
}

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    domain: { type: 'string' },
    severity: { type: 'string', enum: ['critical', 'major', 'minor', 'pass'] },
    findings: { type: 'array', items: FINDING_SCHEMA },
    verdict: { type: 'string', description: 'one-sentence domain verdict' }
  },
  required: ['domain', 'severity', 'findings', 'verdict']
}

const diff = args.diff
const changedFiles = args.changedFiles
const projectContext = args.projectContext || 'No project context provided.'
const artifacts = args.artifacts || 'No artifact documents provided.'

const EXPERTS = [
  {
    role: 'Architecture',
    mandate: `You are an Architecture expert conducting a focused, independent code review. Your domain is clean architecture only — ignore style, naming, and other concerns.

Review for:
- Separation of concerns: is logic placed where it belongs, or is it mixed across responsibilities?
- Dependency direction: do dependencies point toward abstractions, not toward concrete implementations?
- Layering: does any layer skip or reach across layers it should not touch?
- Single responsibility: do modules, classes, and functions have one reason to change?
- Side effect isolation: are side effects (I/O, mutation, network calls) contained, not scattered through pure logic?

For every finding: name the exact file and location, explain why it is an architecture problem rather than a preference, and give a concrete suggestion.

If you find no issues in your domain, set severity to "pass" and findings to an empty array.`
  },
  {
    role: 'DRY',
    mandate: `You are a DRY (Don't Repeat Yourself) expert conducting a focused, independent code review. Your domain is duplication and abstraction only — ignore architecture, naming, and other concerns.

Review for:
- Duplicated logic: the same computation or decision expressed in more than one place
- Copy-paste blocks: nearly identical code that should share a named abstraction
- Redundant data: the same fact stored, derived, or computed in multiple places
- Under-abstraction: concrete code that is repeated where a parameterized abstraction belongs
- Over-abstraction: an abstraction so general it adds no value — this is also a DRY violation because its meaning must be re-derived by every reader

For every finding: name what is duplicated, where both copies live, and what the correct shared abstraction should look like.

If you find no issues in your domain, set severity to "pass" and findings to an empty array.`
  },
  {
    role: 'Clarity',
    mandate: `You are a Clarity expert conducting a focused, independent code review. Your domain is vagueness — any place a reader must guess, infer, or assume instead of read.

Standard: a developer encountering this code for the first time can understand it correctly without asking anyone.

Review for:
- Vague identifiers: names using words like "data", "handle", "process", "thing", "info", "helper", "util", "manage" without qualification
- Implicit contracts: functions that behave differently based on unstated preconditions
- Magic values: literals with no named constant and no comment explaining what they represent
- Overly broad types: any, object, dict, or map[string]interface{} where a precise type would eliminate ambiguity
- Misleading comments: the comment and code disagree, or the comment restates what the code already says clearly instead of explaining why

For every finding: quote the vague identifier or value, explain what a reader would misunderstand, and suggest the precise replacement.

If you find no issues in your domain, set severity to "pass" and findings to an empty array.`
  },
  {
    role: 'SOLID',
    mandate: `You are a SOLID principles expert conducting a focused, independent code review. Your domain is the five SOLID principles only — ignore architecture layers, naming, and other concerns.

S — Single Responsibility: each class or module has exactly one reason to change
O — Open/Closed: behavior can be extended without modifying existing code
L — Liskov Substitution: subtypes can replace supertypes without breaking callers
I — Interface Segregation: clients are not forced to depend on methods they do not use
D — Dependency Inversion: high-level modules depend on abstractions, not on concretions

For every violation: name the principle by letter, explain what it means in this specific context (not abstractly), identify the exact location, and state the consequence if left unaddressed.

If you find no issues in your domain, set severity to "pass" and findings to an empty array.`
  },
  {
    role: 'Project Alignment',
    mandate: `You are a Project Alignment expert conducting a focused, independent code review. Your domain is coherence with the project's established patterns and conventions.

Project context:
${projectContext}

Review for:
- Pattern consistency: does this code follow conventions visible elsewhere in the project?
- Naming alignment: does naming match the project's domain vocabulary?
- Structural placement: does the new code sit where the project structure says it belongs?
- Conceptual coherence: do new abstractions complement or conflict with existing ones?
- Regressions: does this change undermine an established pattern that exists elsewhere?

Misalignment compounds: a future contributor finding contradictory conventions must guess which to follow. Flag anything that forces that guess.

If you find no issues in your domain, set severity to "pass" and findings to an empty array.`
  },
  {
    role: 'Semantic Alignment',
    mandate: `You are a Semantic Alignment expert conducting a focused, independent review. Your domain is cross-artifact truth consistency — the single most common source of long-term drift in a codebase. Your job is to ensure that every claim made anywhere in the system is consistent with every other claim and with what the code actually does.

The failure mode you hunt: one source says "turn right", another says "turn left." Two sources disagreeing about the same truth. This includes:
- A document describing behavior that the code no longer implements
- Two documents making contradictory claims about the same concept, entity, or flow
- Code comments describing a past or imagined version of the function they annotate
- Type definitions that do not match what the implementation actually produces or accepts
- A spec or README stating a contract that the code silently violates
- Any place where the "source of truth" is ambiguous because multiple sources disagree

Artifacts to check:
${artifacts}

Review process:
1. For each claim in any artifact (doc, comment, type, spec): find whether the code and other artifacts confirm or contradict it
2. For each code change in the diff: identify which artifact claims it invalidates or leaves stale
3. Cross-check artifacts against each other: do any two documents disagree about the same fact?

For every finding: quote BOTH conflicting claims verbatim, name the exact source location of each (file and line if possible), state which source is authoritative (the code is authoritative for behavior; a spec or ADR is authoritative for intent), and give a concrete suggestion for resolving the contradiction.

A "pass" here means every claim you found is confirmed by its counterpart. Set severity to "pass" only when you have actively checked and found nothing contradictory — not when artifacts are absent.

If artifacts were not provided or are sparse, state that explicitly in your verdict so the synthesizer and the user know coverage was limited.`
  }
]

phase('Expert Review')

const reviews = await parallel(EXPERTS.map(expert => () =>
  agent(
    expert.mandate + '\n\n--- CODE CHANGES ---\nFiles changed:\n' + changedFiles + '\n\nDiff:\n' + diff + '\n--- END CODE CHANGES ---',
    {
      label: 'expert:' + expert.role,
      phase: 'Expert Review',
      schema: REVIEW_SCHEMA
    }
  )
))

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    overall_verdict: { type: 'string', enum: ['ship', 'revise', 'rework'] },
    summary: { type: 'string', description: 'two to three sentence overall assessment' },
    priority_fixes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          priority: { type: 'number' },
          domain: { type: 'string' },
          location: { type: 'string' },
          issue: { type: 'string' },
          suggestion: { type: 'string' }
        },
        required: ['priority', 'domain', 'location', 'issue', 'suggestion']
      }
    },
    domain_verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          domain: { type: 'string' },
          severity: { type: 'string' },
          verdict: { type: 'string' }
        },
        required: ['domain', 'severity', 'verdict']
      }
    }
  },
  required: ['overall_verdict', 'summary', 'priority_fixes', 'domain_verdicts']
}

phase('Synthesis')

const validReviews = reviews.filter(Boolean)

const report = await agent(
  'Synthesize these expert reviews into a single prioritized action report.\n\nExpert findings:\n' + JSON.stringify(validReviews, null, 2) + '\n\nPrioritization rules:\n1. Critical findings come first — they block shipping\n2. Findings flagged independently by multiple experts rank higher than single-expert findings\n3. Within the same severity, prefer findings with the clearest fix path\n4. Minor findings with no clean fix path may be acknowledged and deferred\n\nVerdicts:\n- "ship": no critical or major issues; the code is ready\n- "revise": major issues present but structure is sound; targeted fixes are sufficient\n- "rework": critical architecture or alignment issues that require structural changes before targeted fixes make sense\n\nEvery priority fix must have a specific location and an actionable suggestion.',
  {
    label: 'synthesis',
    phase: 'Synthesis',
    schema: REPORT_SCHEMA
  }
)

return report
