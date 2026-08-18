import type { ReactNode } from "react";
import Script from "next/script";

export const metadata = {
  title: "Owner Dashboard | Al Nassim Golden Group",
};

export default function SuperadminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Reuses the project's established styling infrastructure (Tailwind via
          the admin layout's Play CDN pattern — no new styling architecture). */}
      <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
      {children}
    </>
  );
}
