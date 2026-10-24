import { Suspense } from "react";
import PrintReportClient from "./PrintReportClient";

export const dynamic = "force-dynamic";

/**
 * Dedicated print-friendly Product Report route. The page itself sits under
 * /admin so the edge middleware admin gate protects it; the data API
 * (/api/admin/products/report) additionally enforces requireAdmin().
 */
export default function AdminPrintReportPage() {
  return (
    <Suspense fallback={<p style={{ padding: 24, fontFamily: "sans-serif" }}>Loading report…</p>}>
      <PrintReportClient />
    </Suspense>
  );
}
