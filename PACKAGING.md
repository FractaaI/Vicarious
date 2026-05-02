# Packaging

Vicarious uses `electron-builder` for local desktop packaging.

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

No custom app icon is configured yet because the repository does not currently include a production icon asset; packaged builds use Electron's default icon.

`demo.vicarious` is a development sample file and is explicitly excluded from packaged app files.
