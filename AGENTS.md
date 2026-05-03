# AGENTS.md

# Vicarious Project Guidance

Vicarious is a desktop writing app for visual novel dialogue. It is a
desktop-only Electron app built with React, TypeScript, Vite, and
electron-vite.

This file is the source of truth for agents modifying this repository. Keep
changes scoped, inspect before editing, and prefer the existing application
shape over new abstractions.

---

## Product Boundaries

- Desktop-only. Browser mode does not need to work.
- Use Electron + electron-vite.
- Projects are plain JSON `.vicarious` files.
- Use explicit New, Open, Save, and Save As flows through native dialogs.
- Recovery autosave writes to `app.getPath('userData')`, never to the project
  file.
- Export only the current scene to Markdown unless a future decision changes
  this.
- Store `currentSceneId` inside the project file.
- Switching scenes does not mark the project dirty.
- Each scene supports up to 4 characters. Do not remove or change this cap
  without an explicit decision.
- Do not migrate browser `localStorage`. Users must export from the browser
  version first.
- Personal use and trusted testing come before public release polish.
- Code signing, notarization, auto-update, crash reporting, and release
  publishing are deferred.
- Do not persist window size or position unless a future feature requires it.

---

## Repository Shape

Use the existing electron-vite structure:

```txt
src/
  main/
  preload/
  renderer/
  shared/
```

- `src/main/` owns Electron windows, filesystem access, native dialogs, IPC
  handlers, app menus, and window lifecycle.
- `src/preload/` exposes the typed context bridge. Keep business logic out of
  preload.
- `src/renderer/` contains the React app.
- `src/shared/` contains pure code used by more than one process.
- Main process must not import from `src/renderer/`.
- Renderer must not import Electron, `fs`, `path`, `shell`, `child_process`, or
  other Node APIs.
- Shared modules must not import Electron or Node APIs unless they are clearly
  main-only and moved out of `src/shared/`.

---

## Workflow Harness

Use the durable feature workflow documented in [docs/workflow.md](docs/workflow.md):

```txt
Ask + Discuss -> Plan -> Implement + Test -> Document -> Iterate
```

- Public, durable guidance belongs in root docs and `docs/`.
- Per-feature planning and progress files belong in local `plans/` and are
  intentionally ignored by git.
- Keep reviewer conversations focused on intent, scope, tradeoffs, and
  acceptance.
- Keep implementation conversations focused on code, tests, docs, and reported
  verification.
- Record durable product, technical, or design choices in
  [DECISIONS.md](DECISIONS.md) or a decision record template when the detail is
  too large for the log.

---

## Agent Rules

- Inspect the existing repository before editing.
- Check `git status --short` before making changes.
- Do not revert user changes unless explicitly requested.
- Keep changes scoped to the active request.
- Do not redesign the UI unless explicitly requested.
- Use [DESIGN.md](DESIGN.md) when touching UI behavior, layout, visual language,
  copy tone, or interaction patterns.
- Prefer existing project patterns over introducing new abstractions.
- Do not add ESLint, Prettier, test frameworks, or other tooling unless
  explicitly requested.
- Do not change package scripts, dependencies, Electron config, packaging config,
  or generated files unless the request calls for it.
- Do not commit unless the user explicitly asks for commits.
- If commits are requested, keep milestones as separate commits.
- Use branches prefixed with `codex/` unless the user requests another branch
  name.

After each implementation task, report:

- Files created or modified.
- Commands run.
- Verification results.
- Known limitations or open questions.

---

## Verification

For source changes, normally run:

```txt
npm run typecheck
npm run build
```

Run packaging commands only when packaging behavior changed or the user asks:

```txt
npm run package
npm run dist
```

For documentation-only changes, a build is not required unless source or config
files were unexpectedly changed. Still review diffs and report `git status
--short` and `git diff --stat` when requested.

---

## QA Priorities

When reviewing or testing changes, prioritize:

- File-loss risks.
- Dirty-state behavior.
- Recovery autosave behavior.
- Window close protection.
- Electron security mistakes.
- Renderer filesystem or Electron API access.
- IPC payload validation.
- Cross-platform path behavior.
- Markdown export scope and output.
- Accidental changes to the 4-character-per-scene cap.

