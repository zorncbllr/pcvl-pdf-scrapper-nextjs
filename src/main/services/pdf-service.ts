import { getDatabase } from "../database";
import { PdfReader } from "pdfreader";
import fs from "fs";

interface VoterData {
  name: string;
  precinct: string;
  barangay: string;
}

const NAME_REGEX: RegExp =
  /(?:[*A-D]{1,3}[\t ]+)?([\p{Lu}.?'`_-]+(?:[\t ]+[\p{Lu}.?'`_-]+)*(?:,[\t ]*(?:[JS]R\.?|J[\t ]*R\.?|II\.?|III\.?|IV\.?|VI{0,3}|IX|X|V|[0-9]{1,4}))?,[\t ]*[\p{Lu}\t ."'?`._-]+(?:,?[\t ]*(?:[JS]R\.?|J[\t ]*R\.?|II\.?|III\.?|IV\.?|VI{0,3}|IX|X|V|[0-9]{1,4})[\t ]*)?[\p{Lu}\t ."'?`._-]*(?:[\t ]*"[\p{Lu}\s.'"?_`-]*")?)/u;

const PRECINCT_CODE_REGEX = /^\d{4}[A-Za-z]$/i;

const FILTERS = [
  "AMBOLONG", "AMOROY", "AMOTAG", "BAGAUMA", "BALAWING",
  "BALETE", "BANGON", "CABANGCALAN", "CABAS-AN", "CALANAY",
  "CAPSAY", "DAYHAGAN", "DON PABLO DELA ROSA", "GUMAHANG",
  "JABOYOAN", "LANANG", "LUY-A", "MACABUG", "MALUBI",
  "MANAGANAGA", "MANAMOC", "MARIPOSA", "MATABA",
  "MATALANGTALANG", "MATONGOG", "NABONGSORAN", "PANGLE",
  "PANIQUE", "PINANAAN", "POBLACION", "PURO", "SAN AGUSTIN",
  "SAN ISIDRO", "SAWANG", "SYNDICATE", "TALABAAN", "TALIB",
  "TIGBAO", "TINAGO", "TINIGBAN", "AROROY", "MASBATE",
  "NATIONAL", "LOCAL",
];

function isFiltered(text: string): boolean {
  for (const filter of FILTERS) {
    if (text.includes(filter)) return true;
  }
  return false;
}

function processPageRows(
  rows: Map<number, string[]>,
  voters: VoterData[],
  currentPrecinct: string | null,
  currentBarangay: string,
): string {
  let barangay = currentBarangay;

  for (const items of rows.values()) {
    for (const text of items) {
      const barMatch = text.match(/^BARANGAY\s*:\s*(.+)$/i);
      if (barMatch && barMatch[1].trim()) {
        barangay = barMatch[1].trim();
        break;
      }
      if (/^BARANGAY\s*:\s*$/i.test(text)) {
        for (const other of items) {
          if (other !== text && !other.includes(":") && !/^\d/.test(other) && other.trim()) {
            barangay = other.trim();
            break;
          }
        }
      }
    }

    const names: string[] = [];
    const precincts: string[] = [];

    for (const text of items) {
      const pcMatch = text.match(PRECINCT_CODE_REGEX);
      if (pcMatch) {
        precincts.push(pcMatch[0]);
      }

      const nameMatch = text.match(NAME_REGEX);
      if (nameMatch && !isFiltered(nameMatch[0])) {
        names.push(nameMatch[0]);
      }
    }

    for (let i = 0; i < names.length; i++) {
      const pc = precincts[Math.min(i, precincts.length - 1)] ?? currentPrecinct ?? "No Precinct";
      voters.push({ name: names[i], precinct: pc, barangay });
    }
  }

  return barangay;
}

export async function importPDF(filePath: string) {
  try {
    const buffer = fs.readFileSync(filePath);
    let currentPrecinct: string | null = null;
    let currentBarangay = "";
    const voters: VoterData[] = [];
    const rows = new Map<number, string[]>();
    let previousY: number | null = null;

    await new Promise<void>((resolve, reject) => {
      const reader = new PdfReader();

      reader.parseBuffer(buffer, (err: any, data: any) => {
        if (err) {
          reject(new Error("Failed to parse PDF buffer."));
          return;
        }

        if (!data) {
          currentBarangay = processPageRows(rows, voters, currentPrecinct, currentBarangay);
          resolve();
          return;
        }

        if (data.text) {
          const text = data.text.trim();
          if (!text) return;

          const y = Math.round(data.y);

          if (previousY !== null && y < previousY) {
            currentBarangay = processPageRows(rows, voters, currentPrecinct, currentBarangay);
            rows.clear();
          }

          const precMatch = text.match(/Prec : \w+/);
          if (precMatch) {
            currentPrecinct = precMatch[0].replace("Prec : ", "");
          }

          const barMatch = text.match(/^BARANGAY\s*:\s*(.+)$/i);
          if (barMatch && barMatch[1].trim()) {
            currentBarangay = barMatch[1].trim();
          }

          const existing = rows.get(y) || [];
          existing.push(text);
          rows.set(y, existing);

          previousY = y;
        }
      });
    });

    const db = getDatabase();
    const insert = db.prepare(
      "INSERT OR IGNORE INTO voter (name, precinct, barangay, isGiven) VALUES (?, ?, ?, 0)"
    );
    const insertMany = db.transaction((items: VoterData[]) => {
      for (const v of items) {
        insert.run(v.name, v.precinct, v.barangay);
      }
    });
    insertMany(voters);

    const bpInsert = db.prepare(
      "INSERT OR REPLACE INTO barangay_precinct (precinct, barangay) VALUES (?, ?)"
    );
    const bpSync = db.transaction((items: VoterData[]) => {
      const seen = new Set<string>();
      for (const v of items) {
        if (!v.barangay || !v.precinct || seen.has(v.precinct)) continue;
        seen.add(v.precinct);
        bpInsert.run(v.precinct, v.barangay);
      }
    });
    bpSync(voters);

    return {
      msg: "Successfully imported pcvl file.",
      success: true,
    };
  } catch {
    return {
      msg: "There's a duplication in voter's name and precinct",
      success: false,
    };
  }
}
