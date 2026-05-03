# Vicarious

Vicarious is a desktop writing space for visual novel dialogue.

It is built for fast keyboard-first scene writing: the left side is the script editor, and the right side renders a visual chat-like preview of the current scene.

<img width="1912" height="920" alt="screenshot" src="https://github.com/user-attachments/assets/177b21fc-89cc-430c-aa59-65ef586a2bd7" />

---

## Features

- **Desktop App**: Vicarious is now an Electron desktop app. Browser mode and browser storage are no longer supported.
- **Keyboard-First Writing**: Type dialogue quickly with `Enter` for new lines and `Tab` to cycle speakers.
- **Visual Preview**: Review the current scene in a rendered conversation preview while you write.
- **Character Management**: Define and color-code up to four characters per scene, with per-character word counts.
- **Scene Organization**: Break a project into scenes and switch between them without marking the project dirty.
- **Stage Directions**: Type `[...]`, `INT.`, or `EXT.` to format a line as a scene header or action description instead of spoken dialogue.
- **Native File Flow**: Open, Save, Save As, and Export use native desktop dialogs.
- **Markdown Export**: Export the current scene to Markdown for use in a game engine, script editor, or other writing tools.

---

## File Behavior

Vicarious projects are plain JSON `.vicarious` files. Project files store the project title, scenes, current scene, and metadata.

Use **File -> Save** to write changes to the current `.vicarious` file. If the project has not been saved before, Save will route through **Save As**. Use **File -> Save As** to choose a new `.vicarious` file path.

Vicarious uses explicit saves. It does not continuously overwrite your project file in the background.

### Recovery Autosave

When a project has unsaved changes, Vicarious writes a recovery autosave to the app's user data folder after a short debounce. This recovery file is separate from the project file and is used only for crash or interrupted-session recovery.

On startup, if a valid dirty recovery file exists, Vicarious offers to restore or discard it. Restoring opens the recovered project as unsaved, with no project file path attached, so you can choose where to save it.

Successful manual Save or Save As removes the recovery file.

### Browser Data

Browser `localStorage` migration is not supported. If you used the old browser version, export your work from that version first, then open the exported `.vicarious` file in the desktop app.

---

## Markdown Export

Use **File -> Export Scene as Markdown...** to export only the current scene.

Markdown export uses a native save dialog, suggests a filename from the current scene name, and does not mark the project dirty.

---

## Keyboard

Vicarious is meant to disappear once learned.

- **Enter**: write a new line of dialogue
- **Tab**: switch speaker within the scene
- **Backspace**: remove an empty line or step back in structure
- **Up / Down**: move through dialogue lines

File shortcuts are handled by the native application menu:

- **Ctrl+N / Cmd+N**: New Project
- **Ctrl+O / Cmd+O**: Open
- **Ctrl+S / Cmd+S**: Save
- **Ctrl+Shift+S / Cmd+Shift+S**: Save As

---

## Development

Install dependencies:

```sh
npm install
```

Start the Electron development app:

```sh
npm run dev
```

Run TypeScript checks:

```sh
npm run typecheck
```

Build the Electron main, preload, and renderer bundles:

```sh
npm run build
```

`npm run lint` currently runs the same TypeScript check.

The repository includes `demo.vicarious` for local development testing. Open it from the app with **File -> Open...**.

---

## Packaging

Packaging is configured with `electron-builder` for local unpacked desktop builds. The current setup has previously passed local packaging verification.

Create an unpacked app:

```sh
npm run package
```

Create the configured distribution output:

```sh
npm run dist
```

Packaging output is written to `release/`. On Windows, the runnable unpacked app is expected at:

```txt
release/win-unpacked/Vicarious.exe
```

See [PACKAGING.md](PACKAGING.md) for packaging details, exclusions, and deferred release work.

Windows packaging uses the app icon at `build/icon.ico`.

---

## Current Limitations

- Code signing, notarization, auto-update, and public release publishing are deferred.
- `npm audit` still reports a high-severity Electron vulnerability. Fixing it requires a separate major Electron upgrade milestone.

## License

MIT
