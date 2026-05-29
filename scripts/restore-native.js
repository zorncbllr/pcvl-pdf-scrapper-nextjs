const fs = require("fs");
const path = require("path");

const targetDir = path.join(
  "node_modules",
  "better-sqlite3",
  "build",
  "Release"
);
const linuxBackup = path.join(targetDir, "better_sqlite3.node.linux");
const targetFile = path.join(targetDir, "better_sqlite3.node");

if (fs.existsSync(linuxBackup)) {
  fs.copyFileSync(linuxBackup, targetFile);
  fs.unlinkSync(linuxBackup);
  console.log("Restored better-sqlite3 Linux native module.");
}
