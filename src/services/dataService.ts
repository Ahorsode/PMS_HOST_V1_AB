/**
 * Hybrid Data Switcher (dataService.ts)
 * Unified interface for Web (Supabase) and Desktop (SQLite) data operations.
 */

const isDesktop = typeof window !== 'undefined' && 'electronAPI' in window;

export interface QueryParams {
  sql: string;
  params?: any[];
  table?: string;
  action?: 'INSERT' | 'UPDATE' | 'DELETE';
  payload?: any;
}

export const dataService = {
  // --- CORE IPC HANDLERS ---

  async query<T>(params: QueryParams): Promise<T[]> {
    if (isDesktop) {
      return new Promise((resolve, reject) => {
        const cleanup = window.electronAPI.onDataResponse('db-result', (data: T[]) => {
          cleanup?.();
          resolve(data);
        });
        window.electronAPI.onDataResponse('db-error', (err: string) => {
          cleanup?.();
          reject(new Error(err));
        });
        window.electronAPI.sendDataRequest('db-query', params);
      });
    } else {
      const response = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      return response.json();
    }
  },

  async execute(params: QueryParams): Promise<any> {
    if (isDesktop) {
      return new Promise((resolve, reject) => {
        const cleanup = window.electronAPI.onDataResponse('db-result', (data: any) => {
          cleanup?.();
          resolve(data);
        });
        window.electronAPI.onDataResponse('db-error', (err: string) => {
          cleanup?.();
          reject(new Error(err));
        });
        window.electronAPI.sendDataRequest('db-execute', params);
      });
    } else {
      const response = await fetch('/api/db/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      return response.json();
    }
  },

  // --- REFACTORED HEALTH & ISOLATION HOOKS ---

  /**
   * Logs a health event (SICK or DEAD). 
   * On Desktop, this triggers an atomic local write + sync_queue entry.
   */
  /**
   * Logs a health event (SICK or DEAD). 
   * On Desktop, this triggers an atomic local write + sync_queue entry.
   */
  async logHealthEvent(payload: {
    farmId: string;
    batchId: string;
    type: 'SICK' | 'DEAD';
    count: number;
    isolationRoomId?: string;
    userId: string;
    logDate: string;
    category?: string;
    subCategory?: string;
    reason?: string;
  }) {
    const id = crypto.randomUUID();
    const finalPayload = { ...payload, id, createdAt: new Date().toISOString() };
    
    const sql = `
      INSERT INTO mortality (id, farmId, batchId, type, count, isolationRoomId, userId, logDate, category, subCategory, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      finalPayload.id,
      finalPayload.farmId,
      finalPayload.batchId,
      finalPayload.type,
      finalPayload.count,
      finalPayload.isolationRoomId || null,
      finalPayload.userId,
      finalPayload.logDate,
      finalPayload.category || 'General',
      finalPayload.subCategory || '',
      finalPayload.reason || ''
    ];

    return this.execute({
      sql,
      params,
      table: 'mortality',
      action: 'INSERT',
      payload: finalPayload
    });
  },

  // --- REFACTORED ANALYTICS HOOKS ---

  /**
   * Fetches batch comparison data, mapping SQLite raw types to sanitized JS objects.
   */
  async getBatchComparisonData(batchIds: string[], metrics: string[]) {
    if (isDesktop) {
      const placeholders = batchIds.map(() => '?').join(', ');
      const sql = `SELECT * FROM batches WHERE id IN (${placeholders})`;
      const rows = await this.query<any>({ sql, params: batchIds });

      // Sanitize SQLite data (e.g., parse strings to Decimals/Numbers for charts)
      return rows.map(row => ({
        ...row,
        currentCount: Number(row.currentCount),
        initialCount: Number(row.initialCount),
        isolationCount: Number(row.isolationCount)
      }));
    } else {
      const response = await fetch('/api/analytics/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchIds, metrics }),
      });
      return response.json();
    }
  },

  // --- AUDIT & WORKER STAMPS ---

  async createInsertLog(userId: string, farmId: string, table: string, recordId: string) {
    const id = crypto.randomUUID();
    const sql = `
      INSERT INTO insert_logs (id, user_id, farm_id, target_table, record_id)
      VALUES (?, ?, ?, ?, ?)
    `;
    return this.execute({
      sql,
      params: [id, userId, farmId, table, recordId],
      table: 'insert_logs',
      action: 'INSERT',
      payload: { id, user_id: userId, farm_id: farmId, target_table: table, record_id: recordId }
    });
  }
};
