/**
 * Analytics Query Functions
 *
 * Provides query functions for build analytics and metrics.
 */

export interface DailyCompletionStats {
  date: string;
  completedCount: number;
  startedCount: number;
  completionRate: number;
}

export interface BudgetAdherenceStats {
  under: number;
  within: number;
  over: number;
  total: number;
}

export interface OverallStats {
  totalBuildsStarted: number;
  totalBuildsCompleted: number;
  completionRate: number;
  averageTimeToComplete: number | null;
  averageTotalCost: number | null;
}

/**
 * Get completion stats by day for last N days
 */
export async function getCompletionsByDay(
  db: D1Database,
  days: number = 30,
): Promise<DailyCompletionStats[]> {
  try {
    // Get started counts by day
    const startedQuery = await db
      .prepare(
        `SELECT DATE(created_at) as date, COUNT(*) as count
         FROM build_events
         WHERE event_type = 'BUILD_STARTED'
           AND created_at >= datetime('now', '-' || ? || ' days')
         GROUP BY DATE(created_at)
         ORDER BY date DESC`,
      )
      .bind(days)
      .all<{ date: string; count: number }>();

    // Get completed counts by day
    const completedQuery = await db
      .prepare(
        `SELECT DATE(created_at) as date, COUNT(*) as count
         FROM build_events
         WHERE event_type = 'BUILD_COMPLETED'
           AND created_at >= datetime('now', '-' || ? || ' days')
         GROUP BY DATE(created_at)
         ORDER BY date DESC`,
      )
      .bind(days)
      .all<{ date: string; count: number }>();

    // Merge results
    const startedMap = new Map(
      startedQuery.results.map((r) => [r.date, r.count]),
    );
    const completedMap = new Map(
      completedQuery.results.map((r) => [r.date, r.count]),
    );

    // Get all unique dates
    const allDates = new Set([...startedMap.keys(), ...completedMap.keys()]);

    const stats: DailyCompletionStats[] = [];
    for (const date of allDates) {
      const started = startedMap.get(date) || 0;
      const completed = completedMap.get(date) || 0;
      stats.push({
        date,
        startedCount: started,
        completedCount: completed,
        completionRate: started > 0 ? (completed / started) * 100 : 0,
      });
    }

    return stats.sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    console.error("Failed to get completions by day:", error);
    return [];
  }
}

/**
 * Get budget adherence distribution
 */
export async function getBudgetAdherenceStats(
  db: D1Database,
): Promise<BudgetAdherenceStats> {
  try {
    const result = await db
      .prepare(
        `SELECT budget_adherence, COUNT(*) as count
         FROM build_metrics
         GROUP BY budget_adherence`,
      )
      .all<{ budget_adherence: string; count: number }>();

    const stats: BudgetAdherenceStats = {
      under: 0,
      within: 0,
      over: 0,
      total: 0,
    };

    for (const row of result.results) {
      if (row.budget_adherence === "under") stats.under = row.count;
      else if (row.budget_adherence === "within") stats.within = row.count;
      else if (row.budget_adherence === "over") stats.over = row.count;
      stats.total += row.count;
    }

    return stats;
  } catch (error) {
    console.error("Failed to get budget adherence stats:", error);
    return { under: 0, within: 0, over: 0, total: 0 };
  }
}

/**
 * Get overall build statistics
 */
export async function getOverallStats(db: D1Database): Promise<OverallStats> {
  try {
    // Count started and completed builds
    const eventCounts = await db
      .prepare(
        `SELECT event_type, COUNT(*) as count
         FROM build_events
         WHERE event_type IN ('BUILD_STARTED', 'BUILD_COMPLETED')
         GROUP BY event_type`,
      )
      .all<{ event_type: string; count: number }>();

    let totalStarted = 0;
    let totalCompleted = 0;
    for (const row of eventCounts.results) {
      if (row.event_type === "BUILD_STARTED") totalStarted = row.count;
      if (row.event_type === "BUILD_COMPLETED") totalCompleted = row.count;
    }

    // Get average metrics
    const avgMetrics = await db
      .prepare(
        `SELECT AVG(time_to_complete_ms) as avgTime, AVG(total_cost) as avgCost
         FROM build_metrics
         WHERE time_to_complete_ms IS NOT NULL`,
      )
      .first<{ avgTime: number | null; avgCost: number | null }>();

    return {
      totalBuildsStarted: totalStarted,
      totalBuildsCompleted: totalCompleted,
      completionRate:
        totalStarted > 0 ? (totalCompleted / totalStarted) * 100 : 0,
      averageTimeToComplete: avgMetrics?.avgTime ?? null,
      averageTotalCost: avgMetrics?.avgCost ?? null,
    };
  } catch (error) {
    console.error("Failed to get overall stats:", error);
    return {
      totalBuildsStarted: 0,
      totalBuildsCompleted: 0,
      completionRate: 0,
      averageTimeToComplete: null,
      averageTotalCost: null,
    };
  }
}

/**
 * Get events for a specific build (for debugging/viewing)
 */
export async function getBuildEvents(
  db: D1Database,
  buildId: string,
): Promise<
  Array<{
    eventType: string;
    eventData: unknown;
    stepIndex: number | null;
    createdAt: string;
  }>
> {
  try {
    const result = await db
      .prepare(
        `SELECT event_type, event_data, step_index, created_at
         FROM build_events
         WHERE build_id = ?
         ORDER BY created_at ASC`,
      )
      .bind(buildId)
      .all<{
        event_type: string;
        event_data: string;
        step_index: number | null;
        created_at: string;
      }>();

    return result.results.map((row) => ({
      eventType: row.event_type,
      eventData: row.event_data ? JSON.parse(row.event_data) : null,
      stepIndex: row.step_index,
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error("Failed to get build events:", error);
    return [];
  }
}
