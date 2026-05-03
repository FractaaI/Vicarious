# Vicarious

Vicarious is a desktop writing app for visual novel dialogue.

It gives you a fast script editor beside a visual conversation preview, so you can draft scenes, switch speakers, manage characters, and export the current scene without leaving the app.

<img width="1912" height="920" alt="Vicarious screenshot" src="https://github.com/user-attachments/assets/177b21fc-89cc-430c-aa59-65ef586a2bd7" />

---

## Highlights

- **Built for visual novel dialogue**: write dialogue lines, stage directions, scene headers, and character-driven conversations.
- **Live scene preview**: see the current scene rendered as a chat-like visual preview while you write.
- **Keyboard-first editing**: use quick line creation, speaker switching, and line navigation while staying in the script.
- **Scene organization**: split a project into scenes and move between them without marking the project dirty.
- **Character management**: define, rename, recolor, and track up to four characters per scene.
- **Native desktop files**: open, save, save as, and export through native dialogs.
- **Plain project files**: projects are readable JSON `.vicarious` files.
- **Recovery autosave**: unsaved work is protected after crashes without silently overwriting your project file.
- **Markdown export**: export the current scene for use in other writing tools, notes, or game pipelines.

---

## Status

Vicarious is currently an early desktop build. It is ready for personal use and trusted testing, but it is not yet a polished public release.

Windows builds are currently unsigned. If you run a packaged build, Windows SmartScreen or antivirus tools may warn that the app is from an unknown publisher. Only run builds from sources you trust.

Deferred release work includes code signing, notarization, auto-update, crash reporting, and broader public release QA.

---

## Using Projects

Vicarious projects use the `.vicarious` extension. The files are plain JSON and store the project title, scenes, current scene, characters, dialogue, and metadata.

Use the native File menu:

- **New Project** creates a new unsaved project.
- **Open...** opens an existing `.vicarious` file.
- **Save** writes changes to the current file.
- **Save As...** chooses a new `.vicarious` file path.
- **Export Scene as Markdown...** exports only the current scene.

Vicarious uses **explicit saves**. It does not continuously overwrite your project file in the background.

### Recovery

When a project has unsaved changes, Vicarious writes a recovery autosave to the app's user data folder after a short delay. This recovery file is separate from your project file.

If Vicarious finds a valid dirty recovery file on startup, it offers to restore or discard it. Restored recovery opens as an unsaved project with no file path attached, so you can choose where to save it.

Successful manual Save or Save As clears the recovery file.

---

## Writing Shortcuts

- **Enter**: create a new dialogue line
- **Tab**: switch speaker within the current scene
- **Backspace**: remove an empty line or step back in structure
- **Up / Down**: move through dialogue lines

File shortcuts are handled by the native application menu:

- **Ctrl+N / Cmd+N**: New Project
- **Ctrl+O / Cmd+O**: Open
- **Ctrl+S / Cmd+S**: Save
- **Ctrl+Shift+S / Cmd+Shift+S**: Save As

Stage directions and headers can be written with patterns such as `[...]`, `INT.`, or `EXT.`.

---

## Markdown Export

Use **File -> Export Scene as Markdown...** to export the current scene.

Markdown export uses a native save dialog, suggests a filename from the current scene name, and does not mark the project dirty.

---

## Install And Packaging

This repository can build an unpacked Windows app and a Windows installer with `electron-builder`.

Create an unpacked app:

```sh
npm run package
```

Create the configured Windows installer and unpacked distribution output:

```sh
npm run dist
```

Packaging output is written to `release/`.

Expected Windows outputs:

```txt
release/Vicarious-Setup-0.1.0-x64.exe
release/win-unpacked/Vicarious.exe
```

See [PACKAGING.md](PACKAGING.md) for installer details, output paths, troubleshooting, exclusions, uninstall notes, and deferred release work.

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

The repository includes `demo.vicarious` for local development testing. Open it from the app with **File -> Open...**. The demo file is excluded from packaged app builds.

---

## Security

The renderer runs with Node integration disabled, context isolation enabled, and Chromium sandboxing enabled. Filesystem access stays in the Electron main process and is exposed to the renderer only through the typed preload `window.api` bridge.

External links are restricted to `http:` and `https:` URLs.

Run an audit:

```sh
npm audit
```

---

## License

Vicarious is licensed under the MIT License. See [LICENSE](LICENSE) for details.
