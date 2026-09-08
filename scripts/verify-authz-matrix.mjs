/**
 * verify-authz-matrix.mjs — security regression matrix for the role model.
 *
 * Production roles: ADMIN (exactly one active), STAFF (order operations),
 * CUSTOMER (storefront + own orders). SUPERADMIN must be unreachable.
 *
 * The script exercises the REAL HTTP API (no direct DB access for requests):
 *   ANONYMOUS  → protected APIs must reject
 *   CUSTOMER   → own data only; every admin/staff API must reject
 *   STAFF      → order operations allowed; catalog/master/settings/staff
 *                management must reject with 403
 *   ADMIN      → full management surface allowed
 *
 * Usage:
 *   node --env-file=.env scripts/verify-authz-matrix.mjs [baseUrl]
 *
 * Credentials come from the environment:
 *   AUTHZ_ADMIN_EMAIL / AUTHZ_ADMIN_PASSWORD   (default ADMIN_SEED_*)
 *   AUTHZ_STAFF_EMAIL / AUTHZ_STAFF_PASSWORD   (optional — when omitted a
 *   temporary staff account is created through the admin API and
 *   deactivated again at the end, which itself exercises the staff workflow)
 *
 * NOTE on status codes: admin APIs return 403 for BOTH unauthenticated and
 * wrong-role callers (fail-closed, pre-existing behaviour); customer APIs
 * return 401 when unauthenticated. Both are secure rejections.
 */

const BASE = process.argv[2] || process.env.APP_URL || "http://localhost:3000";

const adminEmail = process.env.AUTHZ_ADMIN_EMAIL || process.env.ADMIN_SEED_EMAIL;
const adminPassword = process.env.AUTHZ_ADMIN_PASSWORD || process.env.ADMIN_SEED_PASSWORD;
if (!adminEmail || !adminPassword) {
  console.error("Missing admin credentials (AUTHZ_ADMIN_EMAIL/PASSWORD or ADMIN_SEED_EMAIL/PASSWORD)");
  process.exit(2);
}

/* ------------------------------ tiny HTTP client ------------------------------ */

async function req(method, path, { cookie, body } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  // Drain the body so the connection is released.
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON (e.g. 404 HTML) */ }
  return { status: res.status, json };
}

async function loginWithCookie(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json().catch(() => null);
  if (res.status !== 200 || !json?.success) {
    throw new Error(`login failed for ${email}: HTTP ${res.status} ${json?.error ?? ""}`);
  }
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const cookieName = process.env.SESSION_COOKIE_NAME || "nassim_sid";
  const cookie = setCookie.map((c) => c.split(";")[0]).find((c) => c.startsWith(`${cookieName}=`));
  return { cookie, user: json.data.user };
}

/* ------------------------------ test harness ------------------------------ */

let passed = 0;
let failed = 0;
function check(session, method, path, expected, note, body) {
  return (async () => {
    const res = await req(method, path, { cookie: session?.cookie, body });
    const okExpected = Array.isArray(expected) ? expected.includes(res.status) : res.status === expected;
    if (okExpected) {
      passed += 1;
      console.log(`  PASS ${session.label.padEnd(10)} ${method.padEnd(6)} ${path.padEnd(46)} → ${res.status}${note ? `  (${note})` : ""}`);
    } else {
      failed += 1;
      console.error(`  FAIL ${session.label.padEnd(10)} ${method.padEnd(6)} ${path.padEnd(46)} → ${res.status}, expected ${Array.isArray(expected) ? expected.join("|") : expected}${note ? `  (${note})` : ""}`);
    }
    return res;
  })();
}

const S = (label, cookie, body) => ({ label, cookie, body });

/* ------------------------------ main ------------------------------ */

async function main() {
  console.log(`Authorization matrix against ${BASE}\n`);

  const admin = await loginWithCookie(adminEmail, adminPassword);
  if (admin.user.role !== "ADMIN") throw new Error(`expected ADMIN, got ${admin.user.role}`);
  const ADMIN = S("ADMIN", admin.cookie);

  /* Temporary staff account (or a provided one). */
  let staffCookie = null;
  let staffEmail = process.env.AUTHZ_STAFF_EMAIL;
  let staffPassword = process.env.AUTHZ_STAFF_PASSWORD;
  let createdStaffId = null;
  if (!staffEmail || !staffPassword) {
    staffEmail = `authz-staff-${Date.now()}@test.local`;
    staffPassword = `AuthzStaff${Date.now()}!`;
    const res = await req("POST", "/api/admin/staff", {
      cookie: admin.cookie,
      body: { name: "Authz Matrix Staff", email: staffEmail, password: staffPassword, designation: "Test" },
    });
    if (res.status !== 201) throw new Error(`temp staff creation failed: HTTP ${res.status} ${res.json?.error}`);
    createdStaffId = res.json.data.staff.id;
    console.log(`Created temporary staff #${createdStaffId} (${staffEmail})\n`);
  }
  const staff = await loginWithCookie(staffEmail, staffPassword);
  if (staff.user.role !== "STAFF") throw new Error(`expected STAFF, got ${staff.user.role}`);
  const STAFF = S("STAFF", staff.cookie);

  /* Temporary customer. */
  const custEmail = `authz-cust-${Date.now()}@test.local`;
  const custPassword = `AuthzCust${Date.now()}!`;
  const reg = await req("POST", "/api/auth/register", {
    body: { name: "Authz Matrix Customer", email: custEmail, password: custPassword, phone: "" },
  });
  if (reg.status !== 201 && reg.status !== 200) throw new Error(`temp customer creation failed: HTTP ${reg.status} ${reg.json?.error}`);
  const cust = await loginWithCookie(custEmail, custPassword);
  if (cust.user.role !== "CUSTOMER") throw new Error(`expected CUSTOMER, got ${cust.user.role}`);
  const CUSTOMER = S("CUSTOMER", cust.cookie);

  const ANON = S("ANONYMOUS", null);

  /* An order that exists (for 404-vs-403 discrimination on order routes). */
  const ordersList = await req("GET", "/api/admin/orders?limit=5", { cookie: admin.cookie });
  const anyOrderId = ordersList.json?.data?.orders?.[0]?.id;

  /* ------------------------------ matrix ------------------------------ */

  console.log("STAFF — order operations (allowed):");
  await check(STAFF, "GET", "/api/admin/stats", 200);
  await check(STAFF, "GET", "/api/admin/orders?page=1&limit=5", 200);
  await check(STAFF, "GET", "/api/admin/customers", 200);
  if (anyOrderId) {
    await check(STAFF, "GET", `/api/admin/orders/${anyOrderId}/timeline`, 200);
    // Non-existent order: the gate must PASS (404 from the lookup), not 403.
    await check(STAFF, "PATCH", "/api/admin/orders", [400, 404], "gate passed — bad id rejected by validation", { id: 999999999, status: "CONFIRMED" });
  }

  console.log("\nSTAFF — catalog / master data / settings / staff management (must be 403):");
  await check(STAFF, "GET", "/api/admin/products?page=1&limit=5", 403);
  await check(STAFF, "POST", "/api/admin/products", 403, undefined, { name: "x" });
  await check(STAFF, "PATCH", "/api/admin/products", 403, undefined, { id: 1, name: "x" });
  await check(STAFF, "DELETE", "/api/admin/products?id=1", 403);
  await check(STAFF, "GET", "/api/admin/master/colors", 403);
  await check(STAFF, "POST", "/api/admin/master/colors", 403, undefined, { name: "x", slug: "x" });
  await check(STAFF, "GET", "/api/admin/hierarchy/categories", 403);
  await check(STAFF, "POST", "/api/admin/hierarchy/categories", 403, undefined, { name: "x", slug: "x" });
  await check(STAFF, "GET", "/api/admin/attributes", 403);
  await check(STAFF, "POST", "/api/admin/upload", 403);
  await check(STAFF, "GET", "/api/admin/audit-log", 403);
  await check(STAFF, "GET", "/api/admin/staff", 403);
  await check(STAFF, "POST", "/api/admin/staff", 403, "staff cannot create staff", { name: "Escalation Attempt", email: `esc-${Date.now()}@test.local`, password: "Password123!" });
  await check(STAFF, "PATCH", `/api/admin/staff/${createdStaffId ?? 1}`, 403, "no self-promotion/deactivation via staff API", { role: "ADMIN", isActive: false });

  console.log("\nSTAFF/ADMIN — superadmin surface (must be gone):");
  await check(STAFF, "GET", "/api/superadmin/overview", 404, "API deleted");
  await check(ADMIN, "GET", "/api/superadmin/overview", 404, "API deleted");
  await check(ANON, "GET", "/superadmin", [404, 307, 308], "page deleted / redirected");
  await check(ANON, "GET", "/superadmin/login", [404, 307, 308], "page deleted");

  console.log("\nADMIN — full management surface (allowed):");
  await check(ADMIN, "GET", "/api/admin/stats", 200);
  await check(ADMIN, "GET", "/api/admin/products?page=1&limit=5", 200);
  await check(ADMIN, "GET", "/api/admin/master/colors", 200);
  await check(ADMIN, "GET", "/api/admin/hierarchy/categories", 200);
  await check(ADMIN, "GET", "/api/admin/audit-log?page=1&limit=5", 200);
  await check(ADMIN, "GET", "/api/admin/staff", 200);
  await check(ADMIN, "GET", "/api/admin/customers", 200);
  await check(ADMIN, "GET", "/api/admin/orders?page=1&limit=5", 200);
  // Invalid create payload → 400 proves the ADMIN passed the gate.
  await check(ADMIN, "POST", "/api/admin/products", 400, "gate passed — schema validation responded", { name: "" });

  console.log("\nCUSTOMER — own data allowed, admin/staff APIs rejected:");
  await check(CUSTOMER, "GET", "/api/auth/me", 200);
  await check(CUSTOMER, "GET", "/api/orders", 200, "own orders list");
  await check(CUSTOMER, "GET", "/api/catalog?page=1&limit=5", 200);
  await check(CUSTOMER, "GET", "/api/admin/orders", 403);
  await check(CUSTOMER, "GET", "/api/admin/products", 403);
  await check(CUSTOMER, "GET", "/api/admin/customers", 403);
  await check(CUSTOMER, "GET", "/api/admin/staff", 403);
  await check(CUSTOMER, "POST", "/api/admin/staff", 403);
  await check(CUSTOMER, "GET", "/api/admin/stats", 403);
  if (anyOrderId) {
    // An order owned by someone else — customer must not see it.
    await check(CUSTOMER, "GET", `/api/orders/${anyOrderId}`, [403, 404], "other customer's order");
  }

  console.log("\nANONYMOUS — protected APIs must reject:");
  await check(ANON, "GET", "/api/admin/orders", 403, "admin APIs fail closed with 403 (pre-existing)");
  await check(ANON, "GET", "/api/admin/staff", 403);
  await check(ANON, "GET", "/api/orders", 401);
  // /api/auth/me is BY DESIGN 200 + guest:true for anonymous callers (the
  // storefront uses it for Guest Mode) — it must leak no user data.
  {
    const res = await req("GET", "/api/auth/me");
    const guestOk = res.status === 200 && res.json?.data?.user === null && res.json?.data?.guest === true;
    if (guestOk) { passed += 1; console.log("  PASS ANONYMOUS  GET    /api/auth/me                                    → 200 guest:true, no user data"); }
    else { failed += 1; console.error(`  FAIL ANONYMOUS  GET    /api/auth/me → HTTP ${res.status} ${JSON.stringify(res.json?.data)}`); }
  }

  console.log("\nSingle-admin invariants:");
  const staffListing = await req("GET", "/api/admin/staff", { cookie: admin.cookie });
  const adminCount = staffListing.json?.data?.staff?.filter((s) => s.role === "ADMIN").length ?? "?";
  console.log(`  staff accounts with role ADMIN (must be 0): ${adminCount === 0 ? "0 — OK" : adminCount}`);

  /* ------------------------------ cleanup ------------------------------ */

  if (createdStaffId) {
    const deact = await req("PATCH", `/api/admin/staff/${createdStaffId}`, {
      cookie: admin.cookie,
      body: { isActive: false },
    });
    console.log(`\nCleanup: temp staff #${createdStaffId} deactivated → HTTP ${deact.status}`);
    // The deactivated staff session must die immediately.
    const stillAlive = await req("GET", "/api/admin/stats", { cookie: staff.cookie });
    const dead = stillAlive.status === 403;
    if (dead) { passed += 1; console.log("  PASS deactivation revoked the live staff session (403 after deactivate)"); }
    else { failed += 1; console.error(`  FAIL staff session survived deactivation (HTTP ${stillAlive.status})`); }
    const relogin = await loginWithCookie(staffEmail, staffPassword).catch((e) => ({ error: e.message }));
    if (relogin.error) { passed += 1; console.log("  PASS deactivated staff cannot sign in again"); }
    else { failed += 1; console.error("  FAIL deactivated staff could sign in again"); }
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(2);
});
