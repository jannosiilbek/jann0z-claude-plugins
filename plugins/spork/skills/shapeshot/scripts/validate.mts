// Validate a data file against a shapeshot Zod contract.
// Usage: npx -y tsx validate.mts <contract.ts> <data.json> [ExportName]
// Picks ExportName, else the default export, else the last exported Zod schema.
// Prints OK, or one line per failing path. Exit code 0 = valid, 1 = invalid, 2 = usage error.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [contractPath, dataPath, exportName] = process.argv.slice(2);
if (!contractPath || !dataPath) {
  console.error("usage: validate.mts <contract.ts> <data.json> [ExportName]");
  process.exit(2);
}

const mod = await import(pathToFileURL(resolve(contractPath)).href);
const isSchema = (v: unknown): v is { safeParse: (x: unknown) => any } =>
  !!v && typeof (v as any).safeParse === "function";
let schema = exportName ? mod[exportName] : mod.default;
if (!isSchema(schema)) schema = Object.values(mod).filter(isSchema).at(-1);
if (!isSchema(schema)) {
  console.error(`no Zod schema found in ${contractPath}${exportName ? ` named ${exportName}` : ""}`);
  process.exit(2);
}

let data: unknown;
try {
  data = JSON.parse(readFileSync(resolve(dataPath), "utf8"));
} catch (e) {
  console.error(`cannot read JSON from ${dataPath}: ${(e as Error).message}`);
  process.exit(1);
}

const result = schema.safeParse(data);
if (result.success) {
  console.log("OK");
  process.exit(0);
}
const fmt = (path: PropertyKey[]) =>
  path.reduce<string>((s, k) => (typeof k === "number" ? `${s}[${k}]` : s ? `${s}.${String(k)}` : String(k)), "") || "(root)";
const issues = result.error.issues as { path: PropertyKey[]; message: string; code: string }[];
for (const i of issues) console.log(`${fmt(i.path)}: ${i.message} (${i.code})`);
console.log(`${issues.length} issue(s)`);
process.exit(1);
