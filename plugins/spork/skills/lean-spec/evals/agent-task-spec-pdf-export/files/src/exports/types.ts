export interface Column { id: string; label: string }
export interface Filter { matches(row: Record<string, unknown>): boolean }
export interface Report { id: string; columns: Column[]; rows: Record<string, unknown>[]; charts: unknown[] }
export interface ExportOptions { filters: Filter[]; columnOrder?: string[] }
