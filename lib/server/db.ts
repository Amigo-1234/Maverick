/**
 * Database access (server only).
 *  - DATABASE_URL set   → PostgreSQL (Supabase in production) through node-postgres.
 *                          Run `npm run db:migrate` to apply migrations.
 *  - DATABASE_URL unset → PGlite, an embedded PostgreSQL stored in .data/pglite (local dev and tests).
 *                          Migrations are applied automatically.
 * The same SQL runs on both.
 */
import { MIGRATIONS } from "./migrations.generated";

export type Row = Record<string, unknown>;
export interface Q { query<T = Row>(text: string, params?: unknown[]): Promise<T[]> }

type Driver = Q & { tx<T>(fn: (q: Q) => Promise<T>): Promise<T> };

const g = globalThis as unknown as { __mvDb?: Promise<Driver> };

async function pgDriver(url: string): Promise<Driver> {
  const { Pool } = await import("pg");
  const local = /localhost|127\.0\.0\.1/.test(url);
  const pool = new Pool({ connectionString: url, max: Number(process.env.DATABASE_POOL_MAX ?? 5), ssl: local ? false : { rejectUnauthorized: false } });
  const run = async <T>(c: { query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }> }, text: string, params?: unknown[]) => (await c.query(text, params)).rows as T[];
  return {
    query: (text, params) => run(pool, text, params),
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const out = await fn({ query: (t, p) => run(client, t, p) });
        await client.query("commit");
        return out;
      } catch (e) { await client.query("rollback").catch(() => {}); throw e; }
      finally { client.release(); }
    },
  };
}

async function pgliteDriver(): Promise<Driver> {
  const { PGlite } = await import("@electric-sql/pglite");
  // During `next build` several workers render at once, so each gets a private in-memory copy.
  const building = process.env.NEXT_PHASE === "phase-production-build";
  const dir = building ? undefined : (process.env.PGLITE_DIR || ".data/pglite");
  if (dir) (await import("node:fs")).mkdirSync(dir, { recursive: true });
  const db = new PGlite(dir);
  await db.exec("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const done = new Set((await db.query<{ name: string }>("select name from schema_migrations")).rows.map((r) => r.name));
  for (const m of MIGRATIONS) {
    if (done.has(m.name)) continue;
    await db.transaction(async (t) => { await t.exec(m.sql); await t.query("insert into schema_migrations (name) values ($1)", [m.name]); });
  }
  return {
    query: async (text, params) => (await db.query(text, params)).rows as never,
    tx: (fn) => db.transaction((t) => fn({ query: async (text, params) => (await t.query(text, params)).rows as never })),
  };
}

function driver() {
  if (!g.__mvDb) {
    const url = process.env.DATABASE_URL?.trim();
    g.__mvDb = (url ? pgDriver(url) : pgliteDriver()).catch((e) => { g.__mvDb = undefined; throw e; });
  }
  return g.__mvDb;
}

export async function sql<T = Row>(text: string, params?: unknown[]) { return (await driver()).query<T>(text, params); }
export async function one<T = Row>(text: string, params?: unknown[]) { return (await sql<T>(text, params))[0] ?? null; }
/** Runs `fn` in a transaction: everything inside commits together or not at all. */
export async function tx<T>(fn: (q: Q) => Promise<T>) { return (await driver()).tx(fn); }
