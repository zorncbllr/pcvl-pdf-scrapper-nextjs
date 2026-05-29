import { getDatabase } from "../database";
import { PdfReader } from "pdfreader";
import fs from "fs";

interface VoterData {
  name: string;
  precinct: string;
}

export async function importPDF(filePath: string) {
  try {
    const buffer = fs.readFileSync(filePath);
    let currentPrecinct: string | null = null;
    const voters: VoterData[] = [];

    await new Promise<void>((resolve, reject) => {
      const reader = new PdfReader();

      reader.parseBuffer(buffer, (err: any, data: any) => {
        if (err) {
          reject(new Error("Failed to parse PDF buffer."));
          return;
        }

        if (!data) {
          resolve();
          return;
        }

        if (data.text) {
          const match = data.text.match(/Prec : \w+/);

          if (match) {
            currentPrecinct = match[0].replace("Prec : ", "");
          }

          const regex: RegExp =
            /(?:[*A-D]{1,3}[\t ]+)?([\p{Lu}.?'`_-]+(?:[\t ]+[\p{Lu}.?'`_-]+)*(?:,[\t ]*(?:[JS]R\.?|J[\t ]*R\.?|II\.?|III\.?|IV\.?|VI{0,3}|IX|X|V|[0-9]{1,4}))?,[\t ]*[\p{Lu}\t ."'?`._-]+(?:,?[\t ]*(?:[JS]R\.?|J[\t ]*R\.?|II\.?|III\.?|IV\.?|VI{0,3}|IX|X|V|[0-9]{1,4})[\t ]*)?[\p{Lu}\t ."'?`._-]*(?:[\t ]*"[\p{Lu}\s.'"?_`-]*")?)/u;

          const result = data.text.match(regex);

          const filters = [
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

          if (result) {
            let hasAddress = false;
            for (const filter of filters) {
              if (result[0].includes(filter)) {
                hasAddress = true;
                break;
              }
            }

            if (!hasAddress) {
              voters.push({
                name: result[0],
                precinct: currentPrecinct ?? "No Precinct",
              });
            }
          }
        }
      });
    });

    const db = getDatabase();
    const insert = db.prepare(
      "INSERT OR IGNORE INTO voter (name, precinct, isGiven) VALUES (?, ?, 0)"
    );
    const insertMany = db.transaction((items: VoterData[]) => {
      for (const v of items) {
        insert.run(v.name, v.precinct);
      }
    });
    insertMany(voters);

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
