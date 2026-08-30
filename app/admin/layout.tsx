import type { ReactNode } from "react";

export const metadata = {
  title: "Admin | Al Nassim Golden Group",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Local Tailwind build (plugin-free, matches the bare Play CDN this
          layout used to load). React hoists this stylesheet into <head>. */}
      <link rel="stylesheet" href="/assets/css/tailwind.admin.css" precedence="admin-tailwind" />
      {children}
    </>
  );
}
