/**
 * Mock D1 Database for testing
 *
 * Provides an in-memory implementation of Cloudflare D1Database interface
 * that stores data in Maps for testing purposes.
 */

export interface MockRow {
  [key: string]: unknown;
}

interface MockTable {
  rows: MockRow[];
}

interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: {
    duration: number;
    changes: number;
    last_row_id: number;
    served_by: string;
  };
}

/**
 * Mock D1 Prepared Statement
 */
class MockD1PreparedStatement {
  private sql: string;
  private params: unknown[] = [];
  private db: MockD1Database;

  constructor(sql: string, db: MockD1Database) {
    this.sql = sql;
    this.db = db;
  }

  bind(...values: unknown[]): MockD1PreparedStatement {
    this.params = values;
    return this;
  }

  async first<T = MockRow>(columnName?: string): Promise<T | null> {
    const results = await this.all<T>();
    if (results.results.length === 0) {
      return null;
    }
    const row = results.results[0];
    if (columnName && typeof row === "object" && row !== null) {
      return (row as Record<string, unknown>)[columnName] as T;
    }
    return row;
  }

  async all<T = MockRow>(): Promise<D1Result<T>> {
    const result = this.db.execute<T>(this.sql, this.params);
    return result;
  }

  async run(): Promise<D1Result> {
    return this.db.execute(this.sql, this.params);
  }

  async raw<T = unknown[]>(): Promise<T[]> {
    const result = await this.all();
    return result.results.map((row) => Object.values(row as object)) as T[];
  }
}

/**
 * Mock D1 Database
 */
export class MockD1Database {
  private tables: Map<string, MockTable> = new Map();
  private lastInsertId = 0;

  constructor() {
    // Initialize default tables
    this.initializeTables();
  }

  private initializeTables(): void {
    this.tables.set("builds", { rows: [] });
    this.tables.set("build_items", { rows: [] });
    this.tables.set("build_options_shown", { rows: [] });
    this.tables.set("ai_logs", { rows: [] });
    this.tables.set("build_events", { rows: [] });
    this.tables.set("build_metrics", { rows: [] });
  }

  prepare(sql: string): MockD1PreparedStatement {
    return new MockD1PreparedStatement(sql, this);
  }

  /**
   * Execute SQL against the mock database
   */
  execute<T = MockRow>(sql: string, params: unknown[]): D1Result<T> {
    const normalizedSql = sql.trim().toUpperCase();

    if (normalizedSql.startsWith("SELECT 1")) {
      // Health check query
      return {
        results: [{ "1": 1 } as T],
        success: true,
        meta: { duration: 1, changes: 0, last_row_id: 0, served_by: "mock" },
      };
    }

    if (normalizedSql.startsWith("SELECT")) {
      return this.handleSelect<T>(sql, params);
    }

    if (normalizedSql.startsWith("INSERT")) {
      return this.handleInsert(sql, params) as D1Result<T>;
    }

    if (normalizedSql.startsWith("UPDATE")) {
      return this.handleUpdate(sql, params) as D1Result<T>;
    }

    if (normalizedSql.startsWith("DELETE")) {
      return this.handleDelete(sql, params) as D1Result<T>;
    }

    // Default empty result
    return {
      results: [],
      success: true,
      meta: { duration: 1, changes: 0, last_row_id: 0, served_by: "mock" },
    };
  }

  private handleSelect<T>(sql: string, params: unknown[]): D1Result<T> {
    const tableName = this.extractTableName(sql, "FROM");
    const table = this.tables.get(tableName);

    if (!table) {
      return {
        results: [],
        success: true,
        meta: { duration: 1, changes: 0, last_row_id: 0, served_by: "mock" },
      };
    }

    let results = [...table.rows];

    // Handle WHERE clause
    const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
    if (whereMatch && params.length > 0) {
      const column = whereMatch[1];
      const value = params[0];
      results = results.filter((row) => row[column] === value);
    }

    // Handle multiple WHERE conditions (build_id = ? AND step_index = ?)
    const multiWhereMatch = sql.match(
      /WHERE\s+(\w+)\s*=\s*\?\s+AND\s+(\w+)\s*=\s*\?/i,
    );
    if (multiWhereMatch && params.length >= 2) {
      const col1 = multiWhereMatch[1];
      const col2 = multiWhereMatch[2];
      results = table.rows.filter(
        (row) => row[col1] === params[0] && row[col2] === params[1],
      );
    }

    // Handle ORDER BY
    const orderMatch = sql.match(/ORDER BY\s+(\w+)/i);
    if (orderMatch) {
      const orderColumn = orderMatch[1];
      results.sort((a, b) => {
        const aVal = a[orderColumn];
        const bVal = b[orderColumn];
        if (typeof aVal === "number" && typeof bVal === "number") {
          return aVal - bVal;
        }
        return String(aVal).localeCompare(String(bVal));
      });
    }

    return {
      results: results as T[],
      success: true,
      meta: { duration: 1, changes: 0, last_row_id: 0, served_by: "mock" },
    };
  }

  private handleInsert(sql: string, params: unknown[]): D1Result {
    const tableName = this.extractTableName(sql, "INTO");
    let table = this.tables.get(tableName);

    if (!table) {
      table = { rows: [] };
      this.tables.set(tableName, table);
    }

    // Extract column names from SQL
    const columnsMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
    if (columnsMatch) {
      const columns = columnsMatch[1].split(",").map((c) => c.trim());
      const row: MockRow = {};

      columns.forEach((col, index) => {
        row[col] = params[index] ?? null;
      });

      // Set created_at if not provided
      if (!row.created_at) {
        row.created_at = new Date().toISOString();
      }

      table.rows.push(row);
      this.lastInsertId++;
    }

    return {
      results: [],
      success: true,
      meta: {
        duration: 1,
        changes: 1,
        last_row_id: this.lastInsertId,
        served_by: "mock",
      },
    };
  }

  private handleUpdate(sql: string, params: unknown[]): D1Result {
    const tableName = this.extractTableName(sql, "UPDATE");
    const table = this.tables.get(tableName);

    if (!table) {
      return {
        results: [],
        success: true,
        meta: { duration: 1, changes: 0, last_row_id: 0, served_by: "mock" },
      };
    }

    // Find the WHERE clause parameter (usually the last one for id = ?)
    const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
    if (!whereMatch) {
      return {
        results: [],
        success: true,
        meta: { duration: 1, changes: 0, last_row_id: 0, served_by: "mock" },
      };
    }

    const whereColumn = whereMatch[1];
    const whereValue = params[params.length - 1];

    // Extract SET clauses
    const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
    if (!setMatch) {
      return {
        results: [],
        success: true,
        meta: { duration: 1, changes: 0, last_row_id: 0, served_by: "mock" },
      };
    }

    const setClauses = setMatch[1].split(",").map((s) => s.trim());
    let paramIndex = 0;
    let changes = 0;

    table.rows.forEach((row) => {
      if (row[whereColumn] === whereValue) {
        setClauses.forEach((clause) => {
          const colMatch = clause.match(/(\w+)\s*=/);
          if (colMatch) {
            const col = colMatch[1];
            // Check if value is a placeholder or literal
            if (clause.includes("?")) {
              row[col] = params[paramIndex++];
            } else if (clause.includes("datetime('now')")) {
              row[col] = new Date().toISOString();
            } else if (clause.includes("COALESCE")) {
              // Handle COALESCE expressions - simplified
              const val = params[paramIndex++];
              row[col] = val ?? row[col] ?? 0;
            }
          }
        });
        changes++;
      }
    });

    return {
      results: [],
      success: true,
      meta: { duration: 1, changes, last_row_id: 0, served_by: "mock" },
    };
  }

  private handleDelete(sql: string, params: unknown[]): D1Result {
    const tableName = this.extractTableName(sql, "FROM");
    const table = this.tables.get(tableName);

    if (!table) {
      return {
        results: [],
        success: true,
        meta: { duration: 1, changes: 0, last_row_id: 0, served_by: "mock" },
      };
    }

    const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
    if (whereMatch && params.length > 0) {
      const column = whereMatch[1];
      const value = params[0];
      const initialLength = table.rows.length;
      table.rows = table.rows.filter((row) => row[column] !== value);
      const changes = initialLength - table.rows.length;

      return {
        results: [],
        success: true,
        meta: { duration: 1, changes, last_row_id: 0, served_by: "mock" },
      };
    }

    return {
      results: [],
      success: true,
      meta: { duration: 1, changes: 0, last_row_id: 0, served_by: "mock" },
    };
  }

  private extractTableName(
    sql: string,
    keyword: "FROM" | "INTO" | "UPDATE",
  ): string {
    const regex = new RegExp(`${keyword}\\s+(\\w+)`, "i");
    const match = sql.match(regex);
    return match ? match[1].toLowerCase() : "";
  }

  /**
   * Helper to directly insert test data
   */
  insertTestData(tableName: string, data: MockRow): void {
    let table = this.tables.get(tableName);
    if (!table) {
      table = { rows: [] };
      this.tables.set(tableName, table);
    }
    table.rows.push(data);
  }

  /**
   * Helper to get all data from a table
   */
  getTableData(tableName: string): MockRow[] {
    const table = this.tables.get(tableName);
    return table ? [...table.rows] : [];
  }

  /**
   * Clear all data from all tables
   */
  reset(): void {
    this.tables.forEach((table) => {
      table.rows = [];
    });
    this.lastInsertId = 0;
  }

  /**
   * Batch operations (simplified)
   */
  batch<T = unknown>(
    statements: MockD1PreparedStatement[],
  ): Promise<D1Result<T>[]> {
    return Promise.all(statements.map((stmt) => stmt.all<T>()));
  }
}

/**
 * Create a fresh mock database instance
 */
export function createMockD1(): MockD1Database {
  return new MockD1Database();
}
