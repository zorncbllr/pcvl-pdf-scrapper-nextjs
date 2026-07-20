import { getDatabase } from "../database";

export interface Voter {
  voterId: number;
  name: string;
  precinct: string;
  barangay: string;
  isGiven: boolean;
}

interface VoterRow {
  voterId: number;
  name: string;
  precinct: string;
  barangay: string;
  isGiven: number;
}

function toVoter(row: VoterRow): Voter {
  return { ...row, isGiven: row.isGiven === 1 };
}

export function getVoters(): Voter[] {
  const db = getDatabase();
  const rows = db
    .prepare("SELECT * FROM voter ORDER BY precinct ASC")
    .all() as VoterRow[];
  return rows.map(toVoter);
}

export function addVoter({
  name,
  precinct,
  barangay = "",
}: {
  name: string;
  precinct: string;
  barangay?: string;
}) {
  const db = getDatabase();
  try {
    db.prepare(
      "INSERT INTO voter (name, precinct, barangay, isGiven) VALUES (?, ?, ?, 0)"
    ).run(name, precinct, barangay);
    syncBarangayPrecinct(precinct, barangay);
    return { msg: "Voter has been added Successfully.", success: true };
  } catch {
    return { msg: `Voter ${name} ${precinct} already exists.`, success: false };
  }
}

export function clearVoters() {
  const db = getDatabase();
  db.prepare("DELETE FROM voter").run();
  return { msg: "Voters table has been emptied.", success: true };
}

export function updateVoter({
  voterId,
  name,
  precinct,
  barangay,
}: {
  voterId: number;
  name: string;
  precinct: string;
  barangay?: string;
}) {
  const db = getDatabase();
  try {
    if (barangay !== undefined) {
      db.prepare(
        "UPDATE voter SET name = ?, precinct = ?, barangay = ? WHERE voterId = ?"
      ).run(name, precinct, barangay, voterId);
      syncBarangayPrecinct(precinct, barangay);
    } else {
      db.prepare(
        "UPDATE voter SET name = ?, precinct = ? WHERE voterId = ?"
      ).run(name, precinct, voterId);
    }
    return { msg: "Voter has been updated successfully.", success: true };
  } catch {
    return { msg: `Voter ${name} ${precinct} already exists.`, success: false };
  }
}

export function deleteVoter({ voterId }: { voterId: number }) {
  const db = getDatabase();
  db.prepare("DELETE FROM voter WHERE voterId = ?").run(voterId);
  return { msg: "Voter has been deleted.", success: true };
}

export function updateAllStatus({
  voterIds,
  value,
}: {
  voterIds: number[];
  value: boolean;
}) {
  const db = getDatabase();
  try {
    const stmt = db.prepare("UPDATE voter SET isGiven = ? WHERE voterId = ?");
    const update = db.transaction((ids: number[]) => {
      for (const id of ids) {
        stmt.run(value ? 1 : 0, id);
      }
    });
    update(voterIds);
    return { success: true };
  } catch {
    return { success: false };
  }
}

export function updateStatus({
  voterId,
  value,
}: {
  voterId: number;
  value: boolean;
}) {
  const db = getDatabase();
  try {
    db.prepare("UPDATE voter SET isGiven = ? WHERE voterId = ?").run(
      value ? 1 : 0,
      voterId
    );
    return { success: true };
  } catch {
    return { success: false };
  }
}

export function getBarangayPrecincts(): {
  precinct: string;
  barangay: string;
}[] {
  const db = getDatabase();
  return db
    .prepare("SELECT * FROM barangay_precinct ORDER BY barangay, precinct")
    .all() as { precinct: string; barangay: string }[];
}

function syncBarangayPrecinct(
  precinct: string,
  barangay: string
) {
  if (!precinct || !barangay) return;
  const db = getDatabase();
  db.prepare(
    "INSERT OR REPLACE INTO barangay_precinct (precinct, barangay) VALUES (?, ?)"
  ).run(precinct, barangay);
}
