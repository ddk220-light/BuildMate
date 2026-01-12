/**
 * Database Service
 *
 * Provides helper functions for database operations.
 */

/**
 * Execute a database transaction with multiple statements
 */
export async function executeTransaction(
  db: D1Database,
  statements: Array<{ sql: string; params?: unknown[] }>
): Promise<D1Result[]> {
  const prepared = statements.map((stmt) => {
    const query = db.prepare(stmt.sql);
    if (stmt.params && stmt.params.length > 0) {
      return query.bind(...stmt.params);
    }
    return query;
  });

  return db.batch(prepared);
}

/**
 * Get a single record by ID
 */
export async function getById<T>(
  db: D1Database,
  table: string,
  id: string
): Promise<T | null> {
  const result = await db
    .prepare(`SELECT * FROM ${table} WHERE id = ?`)
    .bind(id)
    .first<T>();

  return result;
}

/**
 * Delete a record by ID
 */
export async function deleteById(
  db: D1Database,
  table: string,
  id: string
): Promise<boolean> {
  const result = await db
    .prepare(`DELETE FROM ${table} WHERE id = ?`)
    .bind(id)
    .run();

  return result.meta.changes > 0;
}

/**
 * Count records in a table with optional filter
 */
export async function countRecords(
  db: D1Database,
  table: string,
  filter?: { column: string; value: string | number }
): Promise<number> {
  let sql = `SELECT COUNT(*) as count FROM ${table}`;
  const params: (string | number)[] = [];

  if (filter) {
    sql += ` WHERE ${filter.column} = ?`;
    params.push(filter.value);
  }

  const query = params.length > 0
    ? db.prepare(sql).bind(...params)
    : db.prepare(sql);

  const result = await query.first<{ count: number }>();

  return result?.count ?? 0;
}

/**
 * Check if a record exists
 */
export async function exists(
  db: D1Database,
  table: string,
  column: string,
  value: string | number
): Promise<boolean> {
  const result = await db
    .prepare(`SELECT 1 FROM ${table} WHERE ${column} = ? LIMIT 1`)
    .bind(value)
    .first();

  return result !== null;
}

/**
 * Paginate query results
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export async function paginate<T>(
  db: D1Database,
  sql: string,
  countSql: string,
  params: (string | number)[],
  pagination: PaginationParams
): Promise<PaginatedResult<T>> {
  const { page, pageSize } = pagination;
  const offset = (page - 1) * pageSize;

  // Get total count
  const countResult = await db
    .prepare(countSql)
    .bind(...params)
    .first<{ count: number }>();

  const totalItems = countResult?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Get paginated data
  const paginatedSql = `${sql} LIMIT ? OFFSET ?`;
  const result = await db
    .prepare(paginatedSql)
    .bind(...params, pageSize, offset)
    .all<T>();

  return {
    data: result.results,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}
