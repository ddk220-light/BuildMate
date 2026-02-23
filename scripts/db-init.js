import fs from 'fs';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const init = async () => {
    if (!process.env.DATABASE_URL) {
        console.error("❌ Error: DATABASE_URL environment variable is not set.");
        console.log("Make sure you are running this with: railway run node scripts/db-init.js");
        process.exit(1);
    }

    console.log("🔌 Connecting to PostgreSQL database...");
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

    try {
        const sqlPath = path.join(__dirname, '../migrations/0002_optimize_storage.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("⏳ Applying optimizations...");
        await pool.query(sql);

        console.log("✅ Database initialized successfully!");
    } catch (err) {
        console.error("❌ Database initialization failed:");
        console.error(err);
        process.exit(1);
    } finally {
        await pool.end();
    }
};

init();
