/**
 * Tiny in-process cache for the public catalog payload.
 *
 * The storefront loads /api/catalog as a script on every page. A Neon round
 * trip costs ~200ms (us-east-2 from Kuwait) and Prisma splits a findMany with
 * includes into several sequential queries, so an uncached hit costs seconds
 * on a cold connection. The catalog is public, read-only data, so a short TTL
 * is safe; admin product mutations call invalidateCatalogCache() so staff
 * edits appear immediately.
 */
const TTL_MS = 30_000;

let cached: { body: string; at: number } | null = null;

export function getCachedCatalogBody(): string | null {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.body;
  return null;
}

export function setCachedCatalogBody(body: string): void {
  cached = { body, at: Date.now() };
}

export function invalidateCatalogCache(): void {
  cached = null;
}
