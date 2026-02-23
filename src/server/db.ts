import pg from 'pg';
const { Pool } = pg;

// We create a single pool for the entire application lifecycle
let pool: pg.Pool;

export function getDbPool() {
    if (!pool) {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            console.warn("DATABASE_URL is not set. Creating a dummy pool.");
            pool = new Pool();
        } else {
            pool = new Pool({
                connectionString,
                // Railway Postgres requires SSL usually? If so, uncomment:
                // ssl: { rejectUnauthorized: false }
            });
        }
    }
    return pool;
}

export class D1ToPgAdapter {
    constructor(private pool: pg.Pool) { }

    prepare(query: string) {
        return new D1PreparedStatement(this.pool, query);
    }
}

class D1PreparedStatement {
    private params: any[] = [];

    constructor(private pool: pg.Pool, private query: string) { }

    bind(...params: any[]) {
        this.params = params;
        return this;
    }

    private buildPgQuery() {
        let pgQuery = this.query;
        // Replace SQLite `?` with PostgreSQL `$1, $2`, etc.
        let i = 1;
        // We only replace `?` that are outside quotes, but a simple regex is usually fine for these queries
        // unless there are literal question marks in strings. The queries in our codebase use standard ? binding.
        // Also, SQLite datetime('now') will break in Postgres. Let's do a quick patch for that:
        pgQuery = pgQuery.replace(/datetime\('now'\)/g, "NOW()");

        pgQuery = pgQuery.replace(/\?/g, () => `$${i++}`);
        return { text: pgQuery, values: this.params };
    }

    async first<T = any>(): Promise<T | null> {
        const q = this.buildPgQuery();
        try {
            const res = await this.pool.query(q);
            return (res.rows[0] as T) || null;
        } catch (e) {
            console.error("DB Error in first():", e, q);
            throw e;
        }
    }

    async all<T = any>(): Promise<{ results: T[] }> {
        const q = this.buildPgQuery();
        try {
            const res = await this.pool.query(q);
            return { results: res.rows as T[] };
        } catch (e) {
            console.error("DB Error in all():", e, q);
            throw e;
        }
    }

    async run() {
        const q = this.buildPgQuery();
        try {
            const res = await this.pool.query(q);
            return { success: true, meta: { changes: res.rowCount } };
        } catch (e) {
            console.error("DB Error in run():", e, q);
            throw e;
        }
    }
}
