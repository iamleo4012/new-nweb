/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";
// Next.js DEV mode evaluates modules/HMR through eval() (170+ eval call sites
// in the dev chunks) — without 'unsafe-eval' every App Router page fails to
// hydrate: forms submit natively (login "doesn't work"), SPAs never render.
// Production builds contain no eval, so the directive is dev-only.
const scriptSrc = isProd
  ? "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com";

/**
 * Content-Security-Policy — built from an inventory of the resources the
 * storefront and admin actually load:
 *   script  'self' + inline page scripts + https://cdn.tailwindcss.com
 *           (the Tailwind Play CDN — see the security notes: migrating to the
 *           local Tailwind build removes this remote script and unlocks a
 *           strict CSP; until then it must be allowed or every page renders
 *           unstyled.)
 *   style   'self' + inline styles/blocks + Google Fonts CSS
 *   font    'self' + Google Fonts files + data:
 *   img     'self' + data:/blob: + lh3.googleusercontent.com (product images
 *           imported from the Google Shopping feed)
 *   connect 'self' — the storefront/admin only call their own API
 *
 * 'unsafe-inline' for script/style is a documented limitation of the
 * static-HTML + Play-CDN architecture, not an oversight. 'unsafe-eval' is
 * granted ONLY in development (Next dev tooling requires it).
 */
const CSP = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const nextConfig = {
  async rewrites() {
    return [{ source: "/", destination: "/home.html" }];
  },
  async redirects() {
    return [
      // index.html is retired; home.html is the single homepage.
      { source: "/index.html", destination: "/home.html", permanent: true },
    ];
  },
  async headers() {
    const headers = [
      {
        // home.html is the entry page iterated on from phones — force
        // revalidation so a stale Safari cache can never serve an old copy
        // that predates carousel/loading fixes.
        source: "/((?:home\\.html)?)",
        headers: [
          { key: "Cache-Control", value: "no-cache, must-revalidate" },
        ],
      },
      {
        // Applies to every path (including /uploads and other public assets,
        // which the middleware matcher deliberately skips).
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
        ],
      },
    ];
    if (isProd) {
      // HSTS only once the site is actually served over HTTPS in production
      // builds — sending it from plain HTTP would break local HTTP access.
      headers[0].headers.push({ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" });
    }
    return headers;
  },
};

export default nextConfig;
