import { Report, ExportOptions } from "./types";

// Renders the report's visible rows, respecting active filters and column order.
export function exportCsv(report: Report, opts: ExportOptions): Buffer {
  const cols = opts.columnOrder ?? report.columns.map((c) => c.id);
  const rows = report.rows.filter((r) => opts.filters.every((f) => f.matches(r)));
  const header = cols.join(",");
  const body = rows.map((r) => cols.map((c) => escape(r[c])).join(",")).join("\n");
  return Buffer.from(`${header}\n${body}\n`, "utf8");
}

function escape(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
