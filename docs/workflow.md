# Vicarious Workflow Harness

Vicarious feature work follows a durable conversation split:

```txt
Ask + Discuss -> Plan -> Implement + Test -> Document -> Iterate
```

Use public docs for durable guidance. Use local `plans/` files for per-feature
thinking, drafts, checklists, and progress notes. `plans/` is ignored and should
not be committed.

## 1. Ask + Discuss

Goal: clarify the feature before editing.

- Define the user problem and target workflow.
- Identify non-goals and constraints.
- Check relevant product, technical, and design decisions.
- Decide whether the work needs a local feature plan in `plans/`.

Reviewer conversation focus:

- Intent.
- Product behavior.
- Scope.
- Tradeoffs.
- Acceptance criteria.

## 2. Plan

Goal: produce an implementation path that can be reviewed before code changes.

Use `docs/templates/feature-plan.md` for local plans. Store filled plans under
`plans/`, not in tracked docs.

A good plan names:

- User-facing behavior.
- Files likely to change.
- Data model or IPC impact.
- Dirty-state, recovery, and file-loss risks.
- Test and verification steps.
- Documentation updates.

## 3. Implement + Test

Goal: make the smallest coherent change that satisfies the plan.

- Keep code changes scoped to the feature.
- Preserve Electron security boundaries.
- Do not change scripts, dependencies, packaging, or generated files unless the
  feature requires it.
- Run `npm run typecheck` and `npm run build` for source changes.
- For docs-only changes, review diffs; no build is required unless source or
  config files changed unexpectedly.

Implementation conversation focus:

- Concrete code and docs changes.
- Verification commands and results.
- Bugs found while implementing.
- Remaining limitations.

## 4. Document

Goal: leave future agents enough context to continue safely.

- Update README or PACKAGING only when public usage or packaging behavior
  changes.
- Update DESIGN when UI language or direction changes.
- Update DECISIONS when a durable choice is made.
- Keep detailed per-feature notes in ignored `plans/`.

## 5. Iterate

Goal: use review feedback without losing scope.

- Treat reviewer feedback as product and risk guidance.
- Convert accepted feedback into implementation tasks.
- Keep rejected or deferred feedback documented briefly in the local plan.
- Promote only durable decisions to tracked docs.

