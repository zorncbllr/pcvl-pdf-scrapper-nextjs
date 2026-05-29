import { getDatabase } from "../database";

export interface Voter {
  voterId: number;
  name: string;
  precinct: string;
  isGiven: boolean;
}

interface VoterRow {
  voterId: number;
  name: string;
  precinct: string;
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
}: {
  name: string;
  precinct: string;
}) {
  const db = getDatabase();
  try {
    db.prepare(
      "INSERT INTO voter (name, precinct, isGiven) VALUES (?, ?, 0)"
    ).run(name, precinct);
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
}: {
  voterId: number;
  name: string;
  precinct: string;
}) {
  const db = getDatabase();
  try {
    db.prepare("UPDATE voter SET name = ?, precinct = ? WHERE voterId = ?").run(
      name,
      precinct,
      voterId
    );
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
