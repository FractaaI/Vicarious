# Packaging

Vicarious uses `electron-builder` for local desktop packaging.

The packaging setup exists for local unpacked builds and has previously passed local packaging verification. Re-run the packaging command before distributing a fresh build.

## Local Commands

Run a production build and create an unpacked app only:

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

Run a production build and let `electron-builder` create the configured Windows installer and unpacked app:

```sh
npm run dist
```

On Windows, `npm run dist` creates:

```txt
release/Vicarious-Setup-0.1.0-x64.exe
release/win-unpacked/Vicarious.exe
```

The installer target is NSIS. It installs per user by default, allows choosing the installation directory, creates Start Menu and desktop shortcuts, and includes an uninstaller. Uninstalling the app does not delete the app data folder, so recovery data or local app state is not intentionally removed by the uninstaller.

Code signing, notarization, auto-update, and publishing are intentionally not configured.

## Unsigned Windows Builds

Windows builds produced by this setup are unsigned because code signing is intentionally deferred. If you share packaged artifacts, recipients may see Windows SmartScreen or antivirus warnings that the app is from an unknown publisher.

Only share packaged builds with users who understand this early-build status, and ask them to run builds only from a source they trust.

The repository currently uses Electron 41.5.0. `npm audit` reports no known vulnerabilities after the Electron runtime upgrade.

Windows packaging uses the app icon at `build/icon.ico` for the app executable, installer, and uninstaller.

`demo.vicarious` is a development sample file and is explicitly excluded from packaged app files.

## Manual Windows Installer Check

After `npm run dist`, verify the generated installer manually:

1. Run `release/Vicarious-Setup-0.1.0-x64.exe`.
2. Accept the expected unsigned publisher or SmartScreen warning only if the build came from this repository.
3. Confirm the installer offers a per-user install and allows changing the install directory.
4. Launch Vicarious from the installer, Start Menu shortcut, or desktop shortcut.
5. Use File -> Open... to open a local `.vicarious` file such as the repo-root `demo.vicarious`.
6. Confirm `demo.vicarious` is not present inside the installed app resources.
7. Uninstall Vicarious from Windows Apps settings or the NSIS uninstaller.
