/**
 * create-store-orders-staff.mjs — dedicated Store Staff account for the
 * internal Order Page (/internal-orders.html).
 *
 * Creates ONE new user row using the EXISTING User model and the project's
 * existing bcrypt password hashing — no schema changes, no new auth system.
 * Existing Admin/Staff/Customer accounts are never touched (the upsert is
 * keyed on the dedicated email below).
 *
 * Credentials come from the environment (see .env / .env.example):
 *   STORE_ORDERS_STAFF_EMAIL     (default: store.orders@alnassim.com)
 *   STORE_ORDERS_STAFF_PASSWORD  (required — no insecure fallback)
 *
 * Usage:
 *   node --env-file=.env scripts/create-store-orders-staff.mjs
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const email = (process.env.STORE_ORDERS_STAFF_EMAIL || "store.orders@alnassim.com").toLowerCase();
const password = process.env.STORE_ORDERS_STAFF_PASSWORD;
if (!password) {
  console.error("Missing STORE_ORDERS_STAFF_PASSWORD in environment (.env)");
  process.exit(2);
}

const user = await prisma.user.upsert({
  where: { email },
  // Only the dedicated account's own fields are ever updated here.
  update: { passwordHash: await bcrypt.hash(password, 12), role: "STAFF", isActive: true },
  create: {
    email,
    name: "Store Orders Staff",
    passwordHash: await bcrypt.hash(password, 12),
    role: "STAFF",
  },
});

console.log(`Store Orders Staff account ready: ${user.email} (role ${user.role}, id ${user.id})`);
await prisma.$disconnect();
