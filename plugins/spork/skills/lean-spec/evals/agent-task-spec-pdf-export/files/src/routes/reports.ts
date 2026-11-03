import { Router } from "express";
import { exportCsv } from "../exports/csv";
import { loadReport, parseExportOptions } from "../reports/service";

export const reports = Router();

reports.get("/reports/:id/export", async (req, res) => {
  const report = await loadReport(req.params.id, req.user);
  const opts = parseExportOptions(req.query);
  if (req.query.format !== "csv") return res.status(400).json({ error: "unsupported_format" });
  res.type("text/csv").send(exportCsv(report, opts));
});
