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

Run a production build and let `electron-builder` create its configured distribution targets:

```sh
npm run dist
```

The current configuration uses unpacked directory targets only. Code signing, notarization, auto-update, and publishing are intentionally not configured.

The repository currently uses Electron 35. `npm audit` reports a high-severity Electron vulnerability that requires a separate major Electron upgrade milestone.

Windows packaging uses the app icon at `build/icon.ico`.

`demo.vicarious` is a development sample file and is explicitly excluded from packaged app files.
