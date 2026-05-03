# DECISIONS.md

# Vicarious Decision Log

Chronological log of durable product, technical, and design decisions. Add new
entries when a choice should guide future agents or contributors.

## 2026-05-03

- Vicarious is a desktop-only app. Browser mode and browser persistence are no
  longer supported.
- The desktop app uses Electron + electron-vite with React, TypeScript, Vite,
  and Tailwind CSS.
- The repository uses the standard `src/main`, `src/preload`, `src/renderer`,
  and `src/shared` process split.
- The Electron main process owns filesystem access, native dialogs, menus, IPC
  handlers, and window lifecycle.
- The renderer uses a typed `window.api` preload bridge and must not use Node or
  Electron APIs directly.
- Project files use readable JSON with the `.vicarious` extension.
- Project persistence is explicit: New, Open, Save, and Save As use native
  desktop file flows.
- Recovery autosave is separate from project files and writes to Electron
  `userData`.
- Successful manual Save or Save As clears recovery data.
- Opening dirty recovery restores it as an unsaved project with `filePath = null`
  and `isDirty = true`.
- Markdown export is native and exports only the current scene.
- `currentSceneId` is stored in the project file.
- Switching scenes does not mark a project dirty.
- Each scene supports up to 4 characters.
- Browser `localStorage` migration is intentionally unsupported.
- File menu shortcuts are routed through the native application menu.
- Normal window close is protected by the same dirty-state confirmation flow as
  New and Open.
- Window size and position are not persisted.
- `demo.vicarious` remains a repo-root development sample and is excluded from
  packaged app output.
- Packaging uses electron-builder for local unpacked builds and Windows NSIS
  installer output.
- Code signing, notarization, auto-update, crash reporting, and release
  publishing are deferred.
- Unsigned Windows builds are acceptable for personal use and trusted testing.
- The UI direction is a quiet desktop writing workspace: neutral surfaces,
  literary typography, character color as identity, and minimal ornament.
- Durable public guidance belongs in root docs and `docs/`; per-feature planning
  artifacts belong in local ignored `plans/`.
- Feature work follows `Ask + Discuss -> Plan -> Implement + Test -> Document ->
  Iterate`.

