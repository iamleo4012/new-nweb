import type { ReactNode } from "react";

export const metadata = {
  title: "Owner Dashboard | Al Nassim Golden Group",
};

export default function SuperadminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Reuses the project's established styling infrastructure (Tailwind via
          the local plugin-free build — same stylesheet the admin layout uses). */}
      <link rel="stylesheet" href="/assets/css/tailwind.admin.css" precedence="admin-tailwind" />
      {children}
    </>
  );
}
