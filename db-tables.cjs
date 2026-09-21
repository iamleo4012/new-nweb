const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const rows = await p.$queryRawUnsafe(
    "SELECT table_name, column_name FROM information_schema.columns WHERE column_name ILIKE '%name%' AND table_name NOT IN ('pg_catalog','information_schema') ORDER BY table_name"
  );
  const byTable = {};
  rows.forEach((r) => { (byTable[r.table_name] = byTable[r.table_name] || []).push(r.column_name); });
  Object.keys(byTable).forEach((t) => console.log(t + ': ' + byTable[t].join(', ')));
  await p.$disconnect();
})();
