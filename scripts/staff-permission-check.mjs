/**
 * Staff role regression: login as the seeded STAFF account (password read
 * from .env — never printed), then verify the permission split.
 */
import { readFileSync } from "node:fs";

const env = readFileSync(".env", "utf8");
const m = env.match(/STAFF_SEED_PASSWORD="?([^"\r\n]+)"?/);
const staffPassword = m ? m[1] : "";
if (!staffPassword) {
  console.error("STAFF_SEED_PASSWORD not found in .env");
  process.exit(1);
}

const base = "http://localhost:3000";

async function main() {
  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "staff@alnassim.com", password: staffPassword }),
  });
  const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
  const loginBody = await login.json();
  console.log("staff login role:", loginBody?.data?.user?.role, "| success:", loginBody?.success);

  const check = async (label, path, expected) => {
    const r = await fetch(`${base}${path}`, { headers: { cookie } });
    console.log(`${label}: ${r.status} (expected ${expected}) ${r.status === expected ? "OK" : "FAIL"}`);
  };
  await check("staff /api/auth/me role", "/api/auth/me", 200);
  const me = await (await fetch(`${base}/api/auth/me`, { headers: { cookie } })).json();
  console.log("me role:", me?.data?.user?.role);
  await check("staff /api/admin/stats", "/api/admin/stats", 200);
  await check("staff /api/admin/products (admin-only)", "/api/admin/products", 403);
  await check("staff /api/admin/low-stock", "/api/admin/low-stock", 200);
  await check("staff /api/admin/orders", "/api/admin/orders", 200);
  await check("staff /api/admin/staff (admin-only)", "/api/admin/staff", 403);
}

main().catch((e) => { console.error(e); process.exit(1); });
