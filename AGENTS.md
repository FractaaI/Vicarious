# AGENTS.md

# Vicarious Desktop Migration Instructions

## Project Goal

Convert Vicarious from a React + TypeScript + Vite browser app into a desktop-only Electron app using Electron + electron-vite.

This file is the source of truth for the migration. Follow it when modifying this repository.

---

## Product Decisions

- Desktop-only. Browser mode does not need to keep working.
- Use Electron + electron-vite.
- Use plain JSON `.vicarious` files.
- Use traditional explicit Save / Save As.
- Recovery autosave writes to `app.getPath('userData')`, never to the project file.
- Export only the current scene to Markdown for v1.
- Store `currentSceneId` inside the project file.
- Switching scenes does not mark the project dirty.
- Each scene supports up to 4 characters. Do not remove or change this cap.
- Do not migrate browser `localStorage`. Users must export from the browser version first.
- Personal use first, public release later.
- Code signing, notarization, auto-update, and release publishing are deferred.
- Do not persist window size or position in v1.

---

## Codex Workflow Rules

- Inspect the existing repository before editing.
- Check `git status` before making changes.
- Do not revert user changes unless explicitly requested.
- Keep changes scoped to the active milestone or user request.
- Do not redesign the UI unless explicitly requested.
- Prefer existing project patterns over introducing new abstractions.
- Do not add ESLint, Prettier, test frameworks, or other tooling unless explicitly requested.
- Do not commit unless the user explicitly asks for commits.
- If commits are requested, keep milestones as separate commits.
- Use branches prefixed with `codex/` unless the user requests another branch name.
- After each implementation task, report:
  - Files created or modified.
  - Commands run.
  - Verification results.
  - Any known limitations.

---

## Migration Order

Implement the desktop migration in this order unless the user explicitly asks otherwise:

1. Repository inspection.
2. Scaffold Electron/electron-vite structure.
3. Add shared project types and normalization.
4. Add typed IPC foundation and preload `window.api`.
5. Add native Open, Save, and Save As.
6. Add native application menu.
7. Add dirty-state rules and unsaved protection for New/Open.
8. Add native current-scene Markdown export.
9. Add recovery autosave.
10. Add protected window close behavior.
11. Remove obsolete browser persistence paths and run final verification.
12. Add packaging later only when explicitly requested.

Keep each milestone scoped. Do not implement later milestones early unless required to make the current milestone compile.

---

## Target Project Structure

Use the standard electron-vite structure:

```txt
src/
  main/
    index.ts
  preload/
    index.ts
  renderer/
    src/
      App.tsx
      components/
      hooks/
      types.ts
      domain/
  shared/
    ipc.ts
    project.ts
    projectTypes.ts
    markdown.ts
```

Rules:

- `src/main/` contains Electron main process code. It owns filesystem access, native dialogs, IPC handlers, app menus, and window lifecycle.
- `src/preload/` contains the context bridge only. No business logic.
- `src/renderer/` contains the React app.
- `src/shared/` contains pure code used by more than one process.
- Main process must not import from `src/renderer/`.
- If a pure module is needed by both main and renderer, put it in `src/shared/`.
- Root config files, such as `electron.vite.config.ts`, `package.json`, and `tsconfig.json`, live at the repo root.
- Do not invent another Electron layout.

---

## Scripts

After migration, expected scripts are:

- `npm run dev` starts electron-vite dev mode.
- `npm run build` builds main, preload, and renderer for production.
- `npm run typecheck` runs TypeScript checks across all processes.
- `npm run lint` runs the existing lint command only if linting already exists.

Run these after meaningful implementation changes:

```txt
npm run typecheck
npm run build
```

If a command cannot run because dependencies are missing, network access is blocked, or the environment is incomplete, report the exact command and failure.

---

## Electron Security Rules

- Renderer must not import or use `fs`, `path`, `shell`, `child_process`, Electron APIs, or other Node APIs directly.
- Main process owns all filesystem access.
- Use `contextBridge` in preload to expose a typed `window.api`.
- Do not expose `ipcRenderer` directly.
- `nodeIntegration: false`.
- `contextIsolation: true`.
- Do not enable `enableRemoteModule`.
- Validate all IPC payloads in the main process before acting on them.
- Do not use `window.confirm()` for native app flows.

---

## IPC Rules

Use channel names in the pattern `domain:action`, in kebab-case.

Define IPC channel constants and shared request/response types in:

```txt
src/shared/ipc.ts
```

Avoid scattering string literals across main, preload, and renderer.

Returning `null` from a dialog-based IPC call means the user canceled. It is not an error and must not show an error message.

---

## Renderer -> Main IPC

| Channel | Payload | Returns |
|---|---|---|
| `project:open` | none | `{ project: VicariousProject, filePath: string } \| null` |
| `project:save` | `{ project: VicariousProject, filePath: string }` | `{ ok: true, project: VicariousProject, filePath: string }` |
| `project:save-as` | `{ project: VicariousProject }` | `{ ok: true, project: VicariousProject, filePath: string } \| null` |
| `project:export-md` | `{ markdown: string, suggestedName: string }` | `{ ok: true, filePath: string } \| null` |
| `dialog:confirm-unsaved` | none | `'save' \| 'discard' \| 'cancel'` |
| `recovery:write` | `{ project: VicariousProject, filePath: string \| null, isDirty: boolean }` | `void` |
| `recovery:read` | none | `RecoveryFile \| null` |
| `recovery:discard` | none | `void` |
| `app:close-approved` | none | `void` |

Rules:

- `project:save` requires a non-null `filePath`.
- Renderer decides whether to call `project:save` or `project:save-as`.
- Do not call `project:save` with a missing or null path.
- Main stamps `metadata.updatedAt` and `metadata.appVersion` before writing.
- Main returns the stamped project.
- Renderer must update its in-memory project from the returned stamped project.

---

## Main -> Renderer IPC

| Channel | Payload | Trigger |
|---|---|---|
| `menu:new` | none | File -> New Project |
| `menu:open` | none | File -> Open |
| `menu:save` | none | File -> Save |
| `menu:save-as` | none | File -> Save As |
| `menu:export-md` | none | File -> Export Scene as Markdown |
| `app:request-close` | none | Main process intercepted window close |

Rules:

- File keyboard shortcuts go through native menu actions.
- Do not implement parallel renderer shortcut handling.
- Renderer must unsubscribe menu and app listeners on unmount.
- Raw Electron event objects must never be exposed to renderer callbacks.

---

## Preload `window.api`

Expose a typed `window.api` through `contextBridge`.

Expected shape:

```ts
window.api = {
  openProject: () =>
    ipcRenderer.invoke('project:open'),

  saveProject: (project, filePath) =>
    ipcRenderer.invoke('project:save', { project, filePath }),

  saveProjectAs: (project) =>
    ipcRenderer.invoke('project:save-as', { project }),

  exportMarkdown: (markdown, suggestedName) =>
    ipcRenderer.invoke('project:export-md', { markdown, suggestedName }),

  confirmUnsavedChanges: () =>
    ipcRenderer.invoke('dialog:confirm-unsaved'),

  writeRecovery: (project, filePath, isDirty) =>
    ipcRenderer.invoke('recovery:write', { project, filePath, isDirty }),

  readRecovery: () =>
    ipcRenderer.invoke('recovery:read'),

  discardRecovery: () =>
    ipcRenderer.invoke('recovery:discard'),

  approveClose: () =>
    ipcRenderer.invoke('app:close-approved'),

  onMenuNew: (cb: () => void) => {
    const fn = () => cb();
    ipcRenderer.on('menu:new', fn);
    return () => ipcRenderer.removeListener('menu:new', fn);
  },

  onMenuOpen: (cb: () => void) => {
    const fn = () => cb();
    ipcRenderer.on('menu:open', fn);
    return () => ipcRenderer.removeListener('menu:open', fn);
  },

  onMenuSave: (cb: () => void) => {
    const fn = () => cb();
    ipcRenderer.on('menu:save', fn);
    return () => ipcRenderer.removeListener('menu:save', fn);
  },

  onMenuSaveAs: (cb: () => void) => {
    const fn = () => cb();
    ipcRenderer.on('menu:save-as', fn);
    return () => ipcRenderer.removeListener('menu:save-as', fn);
  },

  onMenuExport: (cb: () => void) => {
    const fn = () => cb();
    ipcRenderer.on('menu:export-md', fn);
    return () => ipcRenderer.removeListener('menu:export-md', fn);
  },

  onRequestClose: (cb: () => void) => {
    const fn = () => cb();
    ipcRenderer.on('app:request-close', fn);
    return () => ipcRenderer.removeListener('app:request-close', fn);
  },
}
```

Add a global TypeScript declaration for `window.api`, for example in:

```txt
src/renderer/src/vite-env.d.ts
```

Renderer code must not use `(window as any).api`.

---

## App Data Model

Existing scene-level types are currently expected in:

```txt
src/renderer/src/types.ts
```

Do not rename or remove:

- `Scene`
- `DialogueLine`
- `Character`

If project-level logic needs to be shared with main, put shared project types in:

```txt
src/shared/projectTypes.ts
```

and re-export them where useful.

### Project Type

```ts
interface VicariousProject {
  version: 1;
  id: string;
  title: string;
  scenes: Scene[];
  currentSceneId: string;
  metadata: {
    createdAt: string;
    updatedAt: string;
    appVersion: string;
  };
}
```

### Recovery Type

```ts
interface RecoveryFile {
  version: 1;
  savedAt: string;
  filePath: string | null;
  isDirty: boolean;
  project: VicariousProject;
}
```

### Legacy File Shape

Browser-exported files may contain only:

```ts
{
  version: 1;
  scenes: Scene[];
  currentSceneId?: string;
}
```

No browser `localStorage` migration is supported.

---

## Project Normalization

Implement pure normalization in:

```txt
src/shared/project.ts
```

Expected API:

```ts
interface NormalizeProjectOptions {
  fallbackTitle: string;
  appVersion: string;
  now?: string;
  generateId?: () => string;
}

function normalizeProject(
  raw: unknown,
  opts: NormalizeProjectOptions
): VicariousProject
```

Rules:

- Must not import Electron.
- Must not import Node APIs.
- Must not import from `src/main`.
- Must not import from `src/renderer`.
- Main derives `fallbackTitle` from filename.
- Main passes `app.getVersion()` as `appVersion`.
- If `currentSceneId` is missing or invalid, default to `scenes[0].id`.
- For legacy files, set `metadata.createdAt` and `metadata.updatedAt` to `opts.now`.
- For already-normalized files, preserve `metadata.createdAt`.
- For already-normalized files, preserve `metadata.updatedAt` on open.
- Throw a descriptive typed error if the payload is structurally invalid.
- Preserve the 4-character-per-scene cap.

Also provide a helper to create a new blank project with one blank scene.

---

## Native Application Menu

Add a native menu in `src/main/index.ts`.

Implement the native menu after native Open, Save, and Save As so menu actions can route to real handlers instead of placeholders.

Expected menu:

```txt
File
  New Project           Cmd+N / Ctrl+N
  Open...               Cmd+O / Ctrl+O
  --------------------------------
  Save                  Cmd+S / Ctrl+S
  Save As...            Cmd+Shift+S / Ctrl+Shift+S
  --------------------------------
  Export Scene as Markdown...

Edit
  Standard Electron defaults:
  undo, redo, cut, copy, paste, select all
```

Rules:

- Menu actions send IPC events to the focused window.
- File shortcuts must go through the menu.
- Do not add duplicate renderer keyboard shortcuts.

---

## Dirty-State Rules

Mark `isDirty = true` when:

- Dialogue text changes.
- Line is added or deleted.
- Scene is added, deleted, or renamed.
- Character is added, deleted, renamed, or recolored.

Do not mark dirty when:

- User switches current scene.
- `currentSceneId` changes only because of scene switching.
- User toggles theme.
- Window is resized.
- User scrolls or moves cursor.
- Recovery write completes.
- Markdown export completes.

Prefer central project mutation handlers for dirty marking. Avoid scattering `setIsDirty(true)` through deeply nested components unless the existing architecture makes that necessary.

Before completing dirty-state work, search project mutation paths and verify each one either marks dirty or is explicitly non-dirty.

---

## File Behavior

### Save

- Renderer calls `project:save` only when `filePath` is set.
- If `filePath` is null, renderer calls `project:save-as`.
- Main validates payload.
- Main stamps `metadata.updatedAt`.
- Main stamps `metadata.appVersion`.
- Main writes pretty JSON using `JSON.stringify(project, null, 2)`.
- Main returns stamped project.
- Renderer updates in-memory project from returned stamped project.
- On success, renderer sets `isDirty = false`.
- Successful manual save deletes recovery.

### Save As

- Show native save dialog filtered to `.vicarious`.
- Main stamps metadata.
- Main writes pretty JSON.
- Main returns stamped project and final `filePath`.
- Renderer sets `filePath`.
- Renderer sets `isDirty = false`.
- Successful manual save deletes recovery.

### Open

- If dirty, call `dialog:confirm-unsaved`.
- If user chooses `save`, attempt save first.
- If save fails or Save As is canceled, abort open.
- If user chooses `cancel`, abort open.
- Show native open dialog filtered to `.vicarious`.
- Read, validate, and normalize with `normalizeProject`.
- Set `filePath`.
- Set `isDirty = false`.
- Canceling the open dialog returns `null` and shows no error.

### New

- If dirty, call `dialog:confirm-unsaved`.
- If user chooses `save`, attempt save first.
- If save fails or Save As is canceled, abort new.
- If user chooses `cancel`, abort new.
- Create a blank `VicariousProject` with one blank scene.
- Set `filePath = null`.
- Set `isDirty = false`.

---

## Atomic Writes

All project and recovery writes must be atomic:

1. Serialize JSON.
2. Write to a temporary file in the same directory as the target.
3. Rename the temporary file over the target path.

This applies to:

- `project:save`
- `project:save-as`
- `recovery:write`

Do not partially overwrite an existing `.vicarious` file if serialization or writing fails.

---

## Recovery Autosave

Recovery file path:

```ts
path.join(app.getPath('userData'), 'recovery.vicarious')
```

Rules:

- Recovery writes only when `isDirty = true`.
- Debounce recovery writes by 3 seconds after the last dirty change.
- Never overwrite the user's project file automatically.
- Recovery payload includes:
  - `version`
  - `savedAt`
  - `filePath`
  - `isDirty`
  - `project`
- Use atomic writes.
- If recovery exists but `isDirty !== true`, discard it silently.
- Recovery errors must not crash the editor.
- Successful manual Save or Save As deletes recovery.

Startup flow:

- Renderer calls `recovery:read` during startup.
- Normal editing is blocked until recovery is handled.
- If no valid dirty recovery exists, continue startup normally.
- If valid dirty recovery exists, offer Restore / Discard.
- Restore loads the recovery project as active.
- Restore sets `filePath = null`.
- Restore treats the restored project as unsaved with `isDirty = true`.
- Discard deletes the recovery file and continues normally.

---

## Markdown Export

- Export current scene only.
- Preserve the existing Markdown export format as closely as possible.
- Generate Markdown in pure shared or renderer domain code.
- Write the file from main process only.
- Show native save dialog with `.md` filter.
- Suggested filename is the current scene name.
- Canceling export returns `null` and shows no error.
- Export does not mark the project dirty.

---

## Final Cleanup Rules

After native file flows are implemented and verified:

- Remove active `localStorage` project persistence.
- Remove browser project upload/download APIs.
- Remove browser Markdown download behavior once native Markdown export is active.
- Keep optional UI-only preference persistence, such as theme persistence, if it does not affect project files.
- Confirm desktop native file flows are the only active project persistence path.

---

## Window Close Behavior

Normal window close must be protected.

Close flow:

1. Main intercepts the window close event.
2. If close was already approved, allow it.
3. Otherwise prevent close.
4. Main sends `app:request-close` to renderer.
5. Renderer runs the same dirty-state confirmation flow used by New and Open.
6. If project is clean, renderer calls `app:close-approved`.
7. If user chooses discard, renderer calls `app:close-approved`.
8. If user chooses save, renderer attempts save first.
9. If save succeeds, renderer calls `app:close-approved`.
10. If save fails, Save As is canceled, or user chooses cancel, renderer does not approve close.
11. Main receives `app:close-approved`, sets a close-approved flag, and closes the window.

If full app quit support introduces complexity, document the limitation and keep normal window close reliable first.

---

## demo.vicarious

The `demo.vicarious` file in the repo root is for developer testing only.

Rules:

- Keep it in the repo root.
- Load it via File -> Open during local development.
- Do not bundle it into the packaged app.
- Exclude it from electron-builder `files` config when packaging is configured.

---

## QA Priorities

When reviewing or testing the migration, focus on:

- Electron security mistakes.
- Renderer filesystem access.
- IPC payload validation.
- File-loss risks.
- Dirty-state bugs.
- Recovery autosave bugs.
- Window close behavior.
- TypeScript errors.
- Cross-platform path issues.
- Accidental changes to the 4-character-per-scene cap.
