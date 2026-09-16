import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { FeedbackRound, GeneratedSite, OnboardingData, SiteRecord, SiteStatus } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

declare global {
  var __tradeSiteDb: Database.Database | undefined;
}

function createConnection(): Database.Database {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      status TEXT NOT NULL,
      onboarding_json TEXT NOT NULL,
      generated_json TEXT NOT NULL,
      feedback_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      name TEXT,
      email TEXT,
      message TEXT
    );
  `);
  return db;
}

function getDb(): Database.Database {
  if (!global.__tradeSiteDb) {
    global.__tradeSiteDb = createConnection();
  }
  return global.__tradeSiteDb;
}

interface SiteRow {
  id: string;
  created_at: string;
  updated_at: string;
  status: SiteStatus;
  onboarding_json: string;
  generated_json: string;
  feedback_json: string;
}

function rowToRecord(row: SiteRow): SiteRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    onboarding: JSON.parse(row.onboarding_json) as OnboardingData,
    generated: JSON.parse(row.generated_json) as GeneratedSite,
    feedbackHistory: JSON.parse(row.feedback_json) as FeedbackRound[],
  };
}

export function insertSite(record: SiteRecord): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO sites (id, created_at, updated_at, status, onboarding_json, generated_json, feedback_json)
     VALUES (@id, @createdAt, @updatedAt, @status, @onboardingJson, @generatedJson, @feedbackJson)`
  ).run({
    id: record.id,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    status: record.status,
    onboardingJson: JSON.stringify(record.onboarding),
    generatedJson: JSON.stringify(record.generated),
    feedbackJson: JSON.stringify(record.feedbackHistory),
  });
}

export function getSite(id: string): SiteRecord | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM sites WHERE id = ?").get(id) as SiteRow | undefined;
  return row ? rowToRecord(row) : null;
}

export function updateSite(record: SiteRecord): void {
  const db = getDb();
  db.prepare(
    `UPDATE sites SET updated_at = @updatedAt, status = @status, onboarding_json = @onboardingJson,
     generated_json = @generatedJson, feedback_json = @feedbackJson WHERE id = @id`
  ).run({
    id: record.id,
    updatedAt: record.updatedAt,
    status: record.status,
    onboardingJson: JSON.stringify(record.onboarding),
    generatedJson: JSON.stringify(record.generated),
    feedbackJson: JSON.stringify(record.feedbackHistory),
  });
}

export function insertLead(lead: { id: string; siteId: string; createdAt: string; name: string; email: string; message: string }): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO leads (id, site_id, created_at, name, email, message) VALUES (@id, @siteId, @createdAt, @name, @email, @message)`
  ).run(lead);
}
