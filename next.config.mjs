/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [{ source: "/", destination: "/index.html" }];
  },
  async redirects() {
    return [
      { source: "/home.html", destination: "/index.html", permanent: true },
      { source: "/house_temp.html", destination: "/houseware.html", permanent: true },
      { source: "/dummy12.html", destination: "/index.html", permanent: true },
      { source: "/code.html", destination: "/index.html", permanent: true },
      { source: "/code_temp.html", destination: "/index.html", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
