# Packaging

Vicarious uses `electron-builder` for local desktop packaging.

The packaging setup exists for local unpacked builds and has previously passed local packaging verification. Re-run the packaging command before distributing a fresh build.

## Local Commands

Run a production build and create an unpacked app:

```sh
npm run package
```

This writes platform-specific output to `release/`. On Windows, the runnable app is expected at:

```txt
release/win-unpacked/Vicarious.exe
```

Before rerunning packaging on Windows, close the packaged Vicarious app and any File Explorer windows open inside `release/`. If `npm run package` fails because `release/win-unpacked/resources/app.asar` or another release file is locked, close those handles and rerun the command. For verification while the default output remains locked, use a unique electron-builder output directory, for example:

```sh
npm run build
npx electron-builder --dir --config.directories.output=release-verify
```

Run a production build and let `electron-builder` create its configured distribution targets:

```sh
npm run dist
```

The current configuration uses unpacked directory targets only. Code signing, notarization, auto-update, and publishing are intentionally not configured.

## Unsigned Windows Builds

Windows builds produced by this setup are unsigned because code signing is intentionally deferred. If you share packaged artifacts, recipients may see Windows SmartScreen or antivirus warnings that the app is from an unknown publisher.

Only share packaged builds with users who understand this early-build status, and ask them to run builds only from a source they trust.

The repository currently uses Electron 41.5.0. `npm audit` reports no known vulnerabilities after the Electron runtime upgrade.

Windows packaging uses the app icon at `build/icon.ico`.

`demo.vicarious` is a development sample file and is explicitly excluded from packaged app files.
