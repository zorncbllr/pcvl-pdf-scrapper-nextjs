const { execSync, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const sqliteVersion = require("better-sqlite3/package.json").version;

// Detect Electron's Node ABI via a temp script
const tmpScript = path.join("/tmp", "_electron_abi.js");
fs.writeFileSync(tmpScript, "process.stdout.write(process.versions.modules); process.exit(0);");

let abi;
try {
  const electronBin = path.resolve("node_modules/.bin/electron");
  abi = execFileSync(electronBin, [tmpScript], {
    encoding: "utf-8",
    timeout: 15000,
  }).trim();
} catch {
  const electronVersion = require("electron/package.json").version;
  console.error(`Could not detect ABI for Electron ${electronVersion}`);
  process.exit(1);
} finally {
  fs.unlinkSync(tmpScript);
}

const url = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${sqliteVersion}/better-sqlite3-v${sqliteVersion}-electron-v${abi}-win32-x64.tar.gz`;
const tmpFile = path.join("/tmp", "better-sqlite3-win.tar.gz");
const targetDir = path.join(
  "node_modules",
  "better-sqlite3",
  "build",
  "Release"
);

console.log(`Detected Electron ABI: v${abi}`);
console.log(`Downloading Windows prebuilt: ${url}`);
execSync(`curl -L -o "${tmpFile}" "${url}"`, { stdio: "inherit" });

// Backup linux binary
const linuxBackup = path.join(targetDir, "better_sqlite3.node.linux");
const targetFile = path.join(targetDir, "better_sqlite3.node");
if (!fs.existsSync(linuxBackup)) {
  fs.copyFileSync(targetFile, linuxBackup);
}

// Extract Windows binary
execSync(`tar -xzf "${tmpFile}" -C "node_modules/better-sqlite3/"`, {
  stdio: "inherit",
});

console.log("Swapped better-sqlite3 native module to Windows build.");
