import type { ReactNode } from "react";
import Script from "next/script";

export const metadata = {
  title: "Admin | Al Nassim Golden Group",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
      {children}
    </>
  );
}
