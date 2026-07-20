import { app } from "electron";
import * as fs from "fs";
import * as path from "path";

interface ExcelMeta {
  fileName: string;
  sheets: string[];
  activeSheet: string;
}

function getDir(): string {
  const dir = path.join(app.getPath("userData"), "excel-persist");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function bufferPath(): string {
  return path.join(getDir(), "excel-buffer.bin");
}

function metaPath(): string {
  return path.join(getDir(), "excel-meta.json");
}

export function saveExcelFile(
  buffer: number[],
  fileName: string,
  sheets: string[],
  activeSheet: string,
): void {
  fs.writeFileSync(bufferPath(), Buffer.from(buffer));
  const meta: ExcelMeta = { fileName, sheets, activeSheet };
  fs.writeFileSync(metaPath(), JSON.stringify(meta));
}

export function loadExcelFile():
  | { buffer: number[]; fileName: string; sheets: string[]; activeSheet: string }
  | null {
  const bp = bufferPath();
  const mp = metaPath();
  if (!fs.existsSync(bp) || !fs.existsSync(mp)) return null;
  try {
    const raw = fs.readFileSync(bp);
    const buffer = Array.from(new Uint8Array(raw));
    const meta: ExcelMeta = JSON.parse(fs.readFileSync(mp, "utf-8"));
    return { buffer, ...meta };
  } catch {
    return null;
  }
}

export function deleteExcelFile(): void {
  try {
    if (fs.existsSync(bufferPath())) fs.unlinkSync(bufferPath());
    if (fs.existsSync(metaPath())) fs.unlinkSync(metaPath());
  } catch {
    // ignore
  }
}
