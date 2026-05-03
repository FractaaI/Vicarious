const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "win32") {
    return;
  }

  const rootDir = __dirname;
  const iconPath = path.join(rootDir, "build", "icon.ico");
  const rceditPath = path.join(rootDir, "node_modules", "electron-winstaller", "vendor", "rcedit.exe");
  const productFilename = context.packager.appInfo.productFilename;
  const exePath = path.join(context.appOutDir, `${productFilename}.exe`);

  for (const requiredPath of [iconPath, rceditPath, exePath]) {
    if (!fs.existsSync(requiredPath)) {
      throw new Error(`Required Windows icon packaging file is missing: ${requiredPath}`);
    }
  }

  await new Promise((resolve, reject) => {
    const child = spawn(rceditPath, [exePath, "--set-icon", iconPath], {
      stdio: "inherit",
      windowsHide: true,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`rcedit failed with exit code ${code}`));
    });
  });
};
