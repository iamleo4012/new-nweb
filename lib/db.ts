import { PrismaClient } from "@prisma/client";
// Importing lib/env triggers startup validation of required environment
// variables (DATABASE_URL, JWT_SECRET, etc.) before the Prisma client is
// constructed. The import has a module-level side effect.
import "@/lib/env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
