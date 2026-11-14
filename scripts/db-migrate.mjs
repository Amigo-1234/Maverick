// Applies pending migrations to the database in DATABASE_URL (e.g. Supabase). Safe to run repeatedly.
//   DATABASE_URL=postgres://… npm run db:migrate
import fs from "node:fs";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) { console.error("Set DATABASE_URL first."); process.exit(1); }
const local = /localhost|127\.0\.0\.1/.test(url);
const client = new pg.Client({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query("select pg_advisory_lock(727001)");
  await client.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const done = new Set((await client.query("select name from schema_migrations")).rows.map((r) => r.name));
  const files = fs.readdirSync("db/migrations").filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();
  for (const f of files) {
    if (done.has(f)) { console.log(`✓ ${f} (already applied)`); continue; }
    await client.query("begin");
    try {
      await client.query(fs.readFileSync(`db/migrations/${f}`, "utf8"));
      await client.query("insert into schema_migrations (name) values ($1)", [f]);
      await client.query("commit");
      console.log(`✓ ${f} applied`);
    } catch (e) { await client.query("rollback"); throw new Error(`${f} failed: ${e.message}`); }
  }
  console.log("Database is up to date.");
} finally {
  await client.query("select pg_advisory_unlock(727001)").catch(() => {});
  await client.end();
}
