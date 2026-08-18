/**
 * lib/analytics.ts — the SINGLE authoritative analytics definition.
 *
 * Revenue rule (must stay identical everywhere — overview, sales chart, top
 * products and category performance all consume the helpers below so the
 * dashboard can never show two different sales figures for one period):
 *
 *   revenue = SUM(OrderItem.price * OrderItem.quantity)
 *   - EXCLUDING items whose itemStatus is REMOVED_AFTER_CONFIRMATION
 *     (the same NON_BILLABLE_STATUSES rule as calculateBillableTotals() in
 *     lib/order-workflow.ts — reused, not reinterpreted), and
 *   - EXCLUDING orders in a terminal CANCELLED_* state (their items were
 *     never sold; cancelled order counts are reported separately).
 *
 * All queries are server-side, parameterized ($1/$2 dates) and aggregate in
 * PostgreSQL — the browser never downloads raw order rows. The
 * Order(createdAt) / OrderItem(productId) indexes (added by the
 * add_superadmin_role_owner_dashboard migration) keep these fast.
 */
import { prisma } from "@/lib/db";

/* ------------------------------------------------------------------ */
/* Exclusion rules — mirror lib/order-workflow.ts                      */
/* ------------------------------------------------------------------ */

/** Same set as NON_BILLABLE_STATUSES in lib/order-workflow.ts. */
export const ANALYTICS_EXCLUDED_ITEM_STATUSES = ["REMOVED_AFTER_CONFIRMATION"] as const;
/** Terminal cancellation states — excluded from revenue, counted separately. */
export const ANALYTICS_CANCELLED_ORDER_STATUSES = ["CANCELLED_BY_CUSTOMER", "CANCELLED_BY_STAFF"] as const;

/**
 * The authoritative billable-rows SQL, split so extra JOINs (Product /
 * hierarchy) can be inserted between the FROM clause and the WHERE clause:
 *   revenue = SUM(oi.price * oi.quantity)
 *   - items with itemStatus REMOVED_AFTER_CONFIRMATION excluded
 *   - orders in terminal CANCELLED_* states excluded
 *   - o.createdAt within [$1, $2)
 */
const BILLABLE_JOINS = `
  FROM "OrderItem" oi
  JOIN "Order" o ON o.id = oi."orderId"
`;
const BILLABLE_WHERE = `
  WHERE oi."itemStatus" NOT IN ('REMOVED_AFTER_CONFIRMATION')
    AND o.status NOT IN ('CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_STAFF')
    AND o."createdAt" >= $1
    AND o."createdAt" < $2
`;
const BILLABLE_ROWS = `${BILLABLE_JOINS}${BILLABLE_WHERE}`;

/* ------------------------------------------------------------------ */
/* Date-range resolution                                               */
/* ------------------------------------------------------------------ */

export const SALES_RANGES = [
  "today",
  "yesterday",
  "7d",
  "30d",
  "this_month",
  "prev_month",
  "this_year",
  "custom",
] as const;
export type SalesRange = (typeof SALES_RANGES)[number];

export interface ResolvedRange {
  range: SalesRange;
  from: Date;
  to: Date;
  bucket: "day" | "month";
  label: string;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/**
 * Resolve a named range (or a custom from/to pair) to an inclusive-day
 * [from, to) interval plus a bucket size (day for ≤ 62 days, else month).
 * All boundaries are local-time, matching the existing admin stats route's
 * "local midnight" convention.
 */
export function resolveRange(
  range: string | null | undefined,
  from?: string | null,
  to?: string | null
): ResolvedRange {
  const now = new Date();
  const today = startOfDay(now);
  const r = (range ?? "30d") as SalesRange;

  let f: Date;
  let t: Date = endOfDay(now);
  let label: string;

  switch (r) {
    case "today":
      f = today;
      label = "Today";
      break;
    case "yesterday": {
      f = new Date(today);
      f.setDate(f.getDate() - 1);
      t = new Date(today);
      t.setMilliseconds(-1);
      label = "Yesterday";
      break;
    }
    case "7d": {
      f = new Date(today);
      f.setDate(f.getDate() - 6);
      label = "Last 7 days";
      break;
    }
    case "30d": {
      f = new Date(today);
      f.setDate(f.getDate() - 29);
      label = "Last 30 days";
      break;
    }
    case "this_month":
      f = new Date(now.getFullYear(), now.getMonth(), 1);
      label = "This month";
      break;
    case "prev_month":
      f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      t = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      label = "Previous month";
      break;
    case "this_year":
      f = new Date(now.getFullYear(), 0, 1);
      label = "This year";
      break;
    case "custom": {
      const parsedFrom = from ? new Date(from) : null;
      const parsedTo = to ? new Date(to) : null;
      if (isNaN(parsedFrom?.getTime() ?? NaN) || isNaN(parsedTo?.getTime() ?? NaN)) {
        throw new Error("Custom range requires valid 'from' and 'to' dates");
      }
      f = startOfDay(parsedFrom!);
      t = endOfDay(parsedTo!);
      if (f > t) [f, t] = [t, f];
      label = `${f.toISOString().slice(0, 10)} → ${t.toISOString().slice(0, 10)}`;
      break;
    }
    default:
      f = new Date(today);
      f.setDate(f.getDate() - 29);
      return { range: "30d", from: f, to: t, bucket: "day", label: "Last 30 days" };
  }

  const days = Math.max(1, Math.round((t.getTime() - f.getTime()) / 86_400_000));
  return { range: r, from: f, to: t, bucket: days <= 62 ? "day" : "month", label };
}

/* ------------------------------------------------------------------ */
/* Core revenue queries (single definition, parameterized)             */
/* ------------------------------------------------------------------ */

export interface RevenueSummary {
  revenue: number;
  orders: number;
  aov: number | null;
}

/** Total billable revenue + distinct billable orders + AOV for a period. */
export async function revenueSummary(from: Date, to: Date): Promise<RevenueSummary> {
  const rows = await prisma.$queryRawUnsafe<Array<{ revenue: string | number; orders: string | number }>>(
    `SELECT COALESCE(SUM(oi.price * oi.quantity), 0)::float8 AS revenue,
            COUNT(DISTINCT o.id)::int AS orders
    ${BILLABLE_ROWS}`,
    from,
    to
  );
  const revenue = Number(rows[0]?.revenue ?? 0);
  const orders = Number(rows[0]?.orders ?? 0);
  return { revenue, orders, aov: orders > 0 ? revenue / orders : null };
}

export interface SeriesPoint {
  bucketStart: string; // ISO timestamp of the bucket start
  revenue: number;
  orders: number;
  aov: number | null;
}

/** Bucketed (day/month) billable revenue + distinct order counts. */
export async function salesSeries(from: Date, to: Date, bucket: "day" | "month"): Promise<SeriesPoint[]> {
  const rows = await prisma.$queryRawUnsafe<
    Array<{ bucket: Date; revenue: string | number; orders: string | number }>
  >(
    `SELECT date_trunc('${bucket}', o."createdAt") AS bucket,
            COALESCE(SUM(oi.price * oi.quantity), 0)::float8 AS revenue,
            COUNT(DISTINCT o.id)::int AS orders
     ${BILLABLE_ROWS}
     GROUP BY 1
     ORDER BY 1`,
    from,
    to
  );
  return rows.map((r) => {
    const revenue = Number(r.revenue);
    const orders = Number(r.orders);
    return {
      bucketStart: new Date(r.bucket).toISOString(),
      revenue,
      orders,
      aov: orders > 0 ? revenue / orders : null,
    };
  });
}

export type TopProductSort = "units" | "revenue" | "lowest";

export interface TopProductRow {
  slug: string;
  name: string;
  image: string;
  units: number;
  revenue: number;
  orders: number;
}

/** Product performance for a period (snapshot name/image with Product fallback). */
export async function topProducts(
  from: Date,
  to: Date,
  sort: TopProductSort,
  limit = 10
): Promise<TopProductRow[]> {
  const order = sort === "units" ? "units DESC" : sort === "revenue" ? "revenue DESC" : "units ASC";
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      slug: string;
      name: string;
      image: string | null;
      units: string | number;
      revenue: string | number;
      orders: string | number;
    }>
  >(
    `SELECT oi.slug,
            MAX(oi.name) AS name,
            COALESCE(NULLIF(MAX(p.image), ''), NULLIF(MAX(oi.image), ''), '') AS image,
            SUM(oi.quantity)::int AS units,
            SUM(oi.price * oi.quantity)::float8 AS revenue,
            COUNT(DISTINCT o.id)::int AS orders
     ${BILLABLE_JOINS}
     LEFT JOIN "Product" p ON p.id = oi."productId"
     ${BILLABLE_WHERE}
     GROUP BY oi.slug
     ORDER BY ${order}
     LIMIT ${Math.min(Math.max(1, limit), 50)}`,
    from,
    to
  );
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    image: r.image ?? "",
    units: Number(r.units),
    revenue: Number(r.revenue),
    orders: Number(r.orders),
  }));
}

export type CategoryLevel = "department" | "category" | "subcategory";

export interface CategoryRow {
  slug: string;
  name: string;
  revenue: number;
  orders: number;
}

/** Revenue/orders grouped by hierarchy level for a period. */
export async function categoryPerformance(
  from: Date,
  to: Date,
  level: CategoryLevel
): Promise<CategoryRow[]> {
  const group =
    level === "department"
      ? `COALESCE(d.slug, 'unknown')`
      : level === "category"
        ? `COALESCE(c.slug, 'unknown')`
        : `COALESCE(s.slug, 'unknown')`;
  const name =
    level === "department"
      ? `COALESCE(d.name, 'Uncategorised')`
      : level === "category"
        ? `COALESCE(c.name, 'Uncategorised')`
        : `COALESCE(s.name, '(No subcategory)')`;

  const rows = await prisma.$queryRawUnsafe<
    Array<{ slug: string; name: string; revenue: string | number; orders: string | number }>
  >(
    `SELECT ${group} AS slug,
            ${name} AS name,
            COALESCE(SUM(oi.price * oi.quantity), 0)::float8 AS revenue,
            COUNT(DISTINCT o.id)::int AS orders
     ${BILLABLE_JOINS}
     LEFT JOIN "Product" p ON p.id = oi."productId"
     LEFT JOIN "Category" c ON c.id = p."categoryId"
     LEFT JOIN "Department" d ON d.id = c."departmentId"
     LEFT JOIN "Subcategory" s ON s.id = p."subcategoryId"
     ${BILLABLE_WHERE}
     GROUP BY 1, 2
     ORDER BY revenue DESC`,
    from,
    to
  );
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    revenue: Number(r.revenue),
    orders: Number(r.orders),
  }));
}
