import fs from "fs/promises";
import path from "path";
import { Pool } from "pg";

export type TicketType = "tech" | "project";
export type TicketStatus = "pending" | "in_progress" | "resolved";

export interface TicketRecord {
  id: string;
  type: TicketType;
  timestamp: string;
  name: string;
  email: string;
  contact: string;
  batch: string;
  domain: string;
  module: string;
  projectType: string;
  description: string;
  audioDataUrl?: string;
  status: TicketStatus;
  resolvedAt?: string;
}

export interface CreateTicketInput {
  type: TicketType;
  name: string;
  email: string;
  contact: string;
  batch: string;
  domain: string;
  module?: string;
  projectType?: string;
  description: string;
  audioDataUrl?: string;
}

const LOCAL_DB_PATH = path.join(process.cwd(), "data", "tickets.json");

let pool: Pool | null = null;
let tableReady = false;

function getPool(): Pool | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function ensureTable(pgPool: Pool): Promise<void> {
  if (tableReady) return;
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      contact TEXT NOT NULL,
      batch TEXT NOT NULL,
      domain TEXT NOT NULL,
      module TEXT NOT NULL DEFAULT '',
      project_type TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL,
      audio_data_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      resolved_at TIMESTAMPTZ
    );
  `);
  tableReady = true;
}

async function readLocalTickets(): Promise<TicketRecord[]> {
  try {
    const raw = await fs.readFile(LOCAL_DB_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocalTickets(tickets: TicketRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(LOCAL_DB_PATH), { recursive: true });
  await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(tickets, null, 2), "utf8");
}

function generateTicketId(): string {
  return `STU-${Math.floor(100000 + Math.random() * 900000)}`;
}

export async function listTickets(): Promise<TicketRecord[]> {
  const pgPool = getPool();
  if (pgPool) {
    await ensureTable(pgPool);
    const { rows } = await pgPool.query(`
      SELECT
        id,
        type,
        timestamp,
        name,
        email,
        contact,
        batch,
        domain,
        module,
        project_type,
        description,
        audio_data_url,
        status,
        resolved_at
      FROM tickets
      ORDER BY timestamp DESC
    `);

    return rows.map((r) => ({
      id: r.id,
      type: r.type === "project" ? "project" : "tech",
      timestamp:
        r.timestamp instanceof Date
          ? r.timestamp.toISOString()
          : String(r.timestamp),
      name: r.name,
      email: r.email,
      contact: r.contact,
      batch: r.batch,
      domain: r.domain,
      module: r.module || "",
      projectType: r.project_type || "",
      description: r.description,
      audioDataUrl: r.audio_data_url || undefined,
      status:
        r.status === "in_progress" || r.status === "resolved"
          ? r.status
          : "pending",
      resolvedAt: r.resolved_at
        ? r.resolved_at instanceof Date
          ? r.resolved_at.toISOString()
          : String(r.resolved_at)
        : undefined,
    }));
  }

  return readLocalTickets();
}

export async function createTicket(
  input: CreateTicketInput
): Promise<TicketRecord> {
  const ticket: TicketRecord = {
    id: generateTicketId(),
    type: input.type,
    timestamp: new Date().toISOString(),
    name: input.name,
    email: input.email,
    contact: input.contact,
    batch: input.batch,
    domain: input.domain,
    module: input.module || "",
    projectType: input.projectType || "",
    description: input.description,
    audioDataUrl: input.audioDataUrl,
    status: "pending",
  };

  const pgPool = getPool();
  if (pgPool) {
    await ensureTable(pgPool);
    await pgPool.query(
      `
      INSERT INTO tickets (
        id, type, timestamp, name, email, contact, batch, domain,
        module, project_type, description, audio_data_url, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `,
      [
        ticket.id,
        ticket.type,
        ticket.timestamp,
        ticket.name,
        ticket.email,
        ticket.contact,
        ticket.batch,
        ticket.domain,
        ticket.module,
        ticket.projectType,
        ticket.description,
        ticket.audioDataUrl || null,
        ticket.status,
      ]
    );
    return ticket;
  }

  const existing = await readLocalTickets();
  await writeLocalTickets([ticket, ...existing]);
  return ticket;
}

export async function updateTicketStatus(
  id: string,
  status: TicketStatus
): Promise<TicketRecord | null> {
  const resolvedAt = status === "resolved" ? new Date().toISOString() : null;

  const pgPool = getPool();
  if (pgPool) {
    await ensureTable(pgPool);
    const { rows } = await pgPool.query(
      `
      UPDATE tickets
      SET status = $2, resolved_at = $3
      WHERE id = $1
      RETURNING *
      `,
      [id, status, resolvedAt]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      type: r.type === "project" ? "project" : "tech",
      timestamp:
        r.timestamp instanceof Date
          ? r.timestamp.toISOString()
          : String(r.timestamp),
      name: r.name,
      email: r.email,
      contact: r.contact,
      batch: r.batch,
      domain: r.domain,
      module: r.module || "",
      projectType: r.project_type || "",
      description: r.description,
      audioDataUrl: r.audio_data_url || undefined,
      status:
        r.status === "in_progress" || r.status === "resolved"
          ? r.status
          : "pending",
      resolvedAt: r.resolved_at
        ? r.resolved_at instanceof Date
          ? r.resolved_at.toISOString()
          : String(r.resolved_at)
        : undefined,
    };
  }

  const existing = await readLocalTickets();
  let updated: TicketRecord | null = null;
  const next = existing.map((t) => {
    if (t.id !== id) return t;
    updated = {
      ...t,
      status,
      resolvedAt: resolvedAt || undefined,
    };
    return updated;
  });
  if (!updated) return null;
  await writeLocalTickets(next);
  return updated;
}
