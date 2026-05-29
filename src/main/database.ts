import Database from "better-sqlite3";
import { app } from "electron";
import path from "path";

let db: Database.Database;

export function initDatabase(): Database.Database {
  const dbPath = path.join(app.getPath("userData"), "voter-management.db");

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS voter (
      voterId INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      precinct TEXT NOT NULL,
      isGiven INTEGER NOT NULL DEFAULT 0,
      UNIQUE(name, precinct)
    )
  `);

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}
