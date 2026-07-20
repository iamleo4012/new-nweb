import type { ReactNode } from "react";

export const metadata = {
  title: "Al Nassim Golden Group",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
