/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy — built from an inventory of the resources the
 * storefront and admin actually load:
 *   script  'self' + inline page scripts + https://cdn.tailwindcss.com
 *           (the Tailwind Play CDN — see the security notes: migrating to the
 *           local Tailwind build removes this remote script and unlocks a
 *           strict CSP; until then it must be allowed or every page renders
 *           unstyled. 'unsafe-eval' is NOT granted — the Play CDN compiles
 *           without it.)
 *   style   'self' + inline styles/blocks + Google Fonts CSS
 *   font    'self' + Google Fonts files + data:
 *   img     'self' + data:/blob: + lh3.googleusercontent.com (product images
 *           imported from the Google Shopping feed)
 *   connect 'self' — the storefront/admin only call their own API
 *
 * 'unsafe-inline' for script/style is a documented limitation of the
 * static-HTML + Play-CDN architecture, not an oversight.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com",
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
