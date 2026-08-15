/**
 * Startup environment validation. Importing this module from anywhere in the
 * app hot path ensures required variables are present and well-formed before
 * the first request is served.
 *
 * Validation runs once per process (module-level) and throws on failure,
 * causing the process to exit loudly rather than serving requests with a
 * broken configuration.
 */

const errors: string[] = [];

function check(name: string, predicate: (v: string) => boolean, message: string): void {
  const value = process.env[name];
  if (value === undefined || value === "" || !predicate(value)) {
    errors.push(`${name}: ${message}`);
  }
}

check("DATABASE_URL", (v) => v.startsWith("postgresql://") || v.startsWith("postgres://"), "must be a postgresql:// connection string");
check("JWT_SECRET", (v) => v.length >= 32, "must be at least 32 characters (use crypto.randomBytes(48).toString('hex'))");
check("SESSION_COOKIE_NAME", (v) => v.length > 0, "must be set");
check("ADMIN_SEED_EMAIL", (v) => v.length > 0, "must be set");

if (errors.length > 0) {
  const msg = `Environment validation failed:\n  - ${errors.join("\n  - ")}\nCopy .env.example to .env and fill in real values.`;
  // In production we throw hard; in dev we still throw so the dev server
  // surfaces the misconfiguration immediately.
  throw new Error(msg);
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME!,
  ADMIN_SEED_EMAIL: process.env.ADMIN_SEED_EMAIL!,
  ADMIN_SEED_PASSWORD: process.env.ADMIN_SEED_PASSWORD,
  NODE_ENV: process.env.NODE_ENV ?? "development",
} as const;
