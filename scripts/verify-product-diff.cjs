/**
 * verify-product-diff.cjs — rigorous typed field-level diff of the Product
 * table between the pre-update pg_dump backup and the live database.
 * Expected differences ONLY:
 *   - non-Kitchenware rows: name = "dummy", price = 0, updatedAt changed
 * Everything else must be identical (typed comparison).
 */
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const { execSync } = require("child_process");
const p = new PrismaClient();

const DUMP = "db-backups/nassim_backup_before_dummy_20260914_154820.dump";
const PG = "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_restore.exe";

(async () => {
  // extract Product data block
  execSync(`"${PG}" -f db-backups/products_pre.sql --table=Product --data-only "${DUMP}"`);
  const lines = fs.readFileSync("db-backups/products_pre.sql", "utf8").split("\n").map(l => l.replace(/\r$/, ""));
  const start = lines.findIndex(l => l.startsWith('COPY public."Product"'));
  if (start === -1) { console.error("COPY block not found"); process.exit(1); }
  const colNames = lines[start].match(/\((.*)\)/)[1].split(",").map(c => c.trim().replace(/^"|"$/g, ""));

  const backupRows = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i] === "\\.") break;
    if (lines[i] === "") continue;
    const vals = lines[i].split("\t");
    if (vals.length !== colNames.length) continue;
    const row = {};
    colNames.forEach((c, idx) => { row[c] = vals[idx] === "\\N" ? null : vals[idx]; });
    backupRows.push(row);
  }
  console.log("backup Product rows parsed:", backupRows.length);

  const live = await p.product.findMany({ orderBy: { id: "asc" } });
  const liveById = new Map(live.map(r => [r.id, r]));

  // typed normalization: pg_dump COPY text vs Prisma JS values
  function norm(col, raw) {
    if (raw === null || raw === undefined) return null;
    const lc = col.toLowerCase();
    if (lc === "price" || ["costprice", "discount", "weight", "length", "width", "height", "depth"].includes(lc)) {
      const n = Number(raw);
      return Number.isNaN(n) ? raw : n;                       // Decimal → number
    }
    if (["isactive", "isfeatured", "isnewarrival", "isbestseller"].includes(lc)) {
      return raw === "t" || raw === true;                     // boolean
    }
    if (["createdat", "updatedat"].includes(lc)) {
      // pg_dump COPY values are UTC wall-clock ("timestamp without time zone");
      // Prisma returns Date objects representing the same instant.
      if (raw instanceof Date) return raw.getTime();
      const s = String(raw);
      const d = /[Z]$|[+]\d{2}:?\d{2}$/.test(s) ? new Date(s) : new Date(s.replace(" ", "T") + "Z");
      return d.getTime();
    }
    if (["specs"].includes(lc)) {
      try { return JSON.stringify(JSON.parse(raw)); } catch { return JSON.stringify(raw); }
    }
    if (["images", "tags", "colors", "sizes"].includes(lc)) {
      // pg text[]: {a,b,c}  |  Prisma: [a,b] | empty: {} / []
      if (typeof raw === "string" && raw.startsWith("{")) {
        const inner = raw.slice(1, -1);
        return JSON.stringify(inner === "" ? [] : inner.split(",").map(x => x.replace(/^"|"$/g, "")));
      }
      if (Array.isArray(raw)) return JSON.stringify(raw);
      return JSON.stringify([raw]);
    }
    if (lc.endsWith("id") || lc === "stock" || lc === "minstock") {
      const n = Number(raw);
      return Number.isNaN(n) ? raw : n;
    }
    return String(raw);
  }

  let kitchenChecked = 0, otherChecked = 0;
  const kitchenBad = [], otherBad = [], missing = [];
  for (const b of backupRows) {
    const id = Number(b.id);
    const l = liveById.get(id);
    if (!l) { missing.push(id); continue; }
    const isKitchen = Number(b["categoryId"]) === 5;
    for (const col of colNames) {
      const lc = col.toLowerCase();
      let expect;
      if (col === "name" && !isKitchen) expect = "dummy";
      else if (col === "price" && !isKitchen) expect = 0;
      else if (lc === "updatedat" && !isKitchen) continue; // updated rows legitimately change
      else expect = norm(col, b[col]);
      const actual = norm(col, l[col]);
      if (JSON.stringify(expect) !== JSON.stringify(actual)) {
        (isKitchen ? kitchenBad : otherBad).push(`#${id} ${col}: expected=${JSON.stringify(expect)} actual=${JSON.stringify(actual)}`);
      }
    }
    if (isKitchen) kitchenChecked++; else otherChecked++;
  }

  console.log("=== KITCHENWARE (all fields must be identical) ===");
  console.log("rows verified:", kitchenChecked);
  console.log("mismatches:", kitchenBad.length ? kitchenBad : "NONE");
  console.log("=== NON-KITCHENWARE (only name/price/updatedAt may differ) ===");
  console.log("rows verified:", otherChecked);
  console.log("unexpected mismatches:", otherBad.length ? otherBad : "NONE");
  console.log("missing from live DB:", missing.length ? missing : "NONE");

  await p.$disconnect();
  if (kitchenBad.length || otherBad.length || missing.length) process.exit(1);
})().catch(e => { console.error("ERR", e.message); process.exit(1); });
