/**
 * Order verification workflow — state machine and helpers.
 *
 * This module is the single source of truth for valid order status
 * transitions. Every API that changes an order's status must call
 * `validateTransition()` to ensure the move is legal.
 *
 * The website NEVER manages inventory, billing, invoices, refunds, or stock.
 * Staff manually check the physical store, then the customer confirms.
 */

import type { OrderStatus, OrderItemStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/* ------------------------------------------------------------------ */
/* Status definitions                                                  */
/* ------------------------------------------------------------------ */

export const ORDER_STATUSES = [
  "PENDING",
  "UNDER_REVIEW",
  "READY_FOR_CONFIRMATION",
  "CONFIRMED",
  "PACKING",
  "READY_FOR_DELIVERY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED_BY_CUSTOMER",
  "CANCELLED_BY_STAFF",
] as const;

export const ITEM_STATUSES = [
  "PENDING",
  "AVAILABLE",
  "UNAVAILABLE",
  "REMOVED_AFTER_CONFIRMATION",
  "DELIVERED",
] as const;

/**
 * Item statuses that should be EXCLUDED from the billable subtotal.
 * These items are not delivered and should not be charged.
 */
const NON_BILLABLE_STATUSES = new Set<string>([
  "REMOVED_AFTER_CONFIRMATION",
]);

/**
 * Shared calculation: compute the billable subtotal, shipping, and total
 * from order items, excluding any item whose status is non-billable.
 *
 * This is the SINGLE source of truth used by all order APIs and the UI.
 */
export function calculateBillableTotals(
  items: { price: unknown; quantity: number; itemStatus: string }[],
  shipping: unknown
): { subtotal: number; shipping: number; total: number } {
  const shipNum = Number(shipping);
  let subtotal = 0;
  for (const item of items) {
    if (NON_BILLABLE_STATUSES.has(item.itemStatus)) continue;
    subtotal += Number(item.price) * item.quantity;
  }
  return { subtotal, shipping: shipNum, total: subtotal + shipNum };
}

/**
 * Check if an item status is billable (included in the customer's total).
 */
export function isBillable(itemStatus: string): boolean {
  return !NON_BILLABLE_STATUSES.has(itemStatus);
}

/**
 * Valid transitions. Each key maps to the set of statuses that may
 * follow it. Any transition not listed here is rejected.
 */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["UNDER_REVIEW", "CANCELLED_BY_STAFF"],
  UNDER_REVIEW: ["READY_FOR_CONFIRMATION", "CANCELLED_BY_STAFF"],
  READY_FOR_CONFIRMATION: ["CONFIRMED", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_STAFF"],
  CONFIRMED: ["PACKING", "CANCELLED_BY_STAFF"],
  PACKING: ["READY_FOR_DELIVERY", "CANCELLED_BY_STAFF"],
  READY_FOR_DELIVERY: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED_BY_CUSTOMER: [],
  CANCELLED_BY_STAFF: [],
};

/**
 * Human-readable labels for the UI.
 */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  UNDER_REVIEW: "Under Review",
  READY_FOR_CONFIRMATION: "Ready for Confirmation",
  CONFIRMED: "Confirmed",
  PACKING: "Packing",
  READY_FOR_DELIVERY: "Ready for Delivery",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED_BY_CUSTOMER: "Cancelled by Customer",
  CANCELLED_BY_STAFF: "Cancelled by Staff",
};

export const ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  PENDING: "Pending Check",
  AVAILABLE: "Available",
  UNAVAILABLE: "Unavailable",
  REMOVED_AFTER_CONFIRMATION: "Removed",
  DELIVERED: "Delivered",
};

/**
 * Colours for status badges (Tailwind classes).
 */
export const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  UNDER_REVIEW: "bg-blue-100 text-blue-800",
  READY_FOR_CONFIRMATION: "bg-indigo-100 text-indigo-800",
  CONFIRMED: "bg-green-100 text-green-800",
  PACKING: "bg-purple-100 text-purple-800",
  READY_FOR_DELIVERY: "bg-cyan-100 text-cyan-800",
  OUT_FOR_DELIVERY: "bg-orange-100 text-orange-800",
  DELIVERED: "bg-teal-100 text-teal-800",
  COMPLETED: "bg-gray-200 text-gray-800",
  CANCELLED_BY_CUSTOMER: "bg-red-100 text-red-800",
  CANCELLED_BY_STAFF: "bg-red-100 text-red-800",
};

/* ------------------------------------------------------------------ */
/* Transition validation                                               */
/* ------------------------------------------------------------------ */

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  const allowed = TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function validateTransition(from: OrderStatus, to: OrderStatus): void {
  if (!isValidTransition(from, to)) {
    throw new TransitionError(
      `Invalid status transition: ${from} → ${to}. Allowed: ${TRANSITIONS[from].join(", ") || "(terminal)"}`
    );
  }
}

export class TransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransitionError";
  }
}

export function isTerminal(status: OrderStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

export function nextStatuses(status: OrderStatus): OrderStatus[] {
  return TRANSITIONS[status];
}

/* ------------------------------------------------------------------ */
/* Notification helper                                                 */
/* ------------------------------------------------------------------ */

/**
 * Create a notification record for the customer associated with an order.
 * Safe to call even if the order has no userId (guest checkout) — the
 * notification is stored with userId=null and can still be retrieved by
 * orderId.
 */
export async function createNotification(
  orderId: number,
  userId: number | null,
  type: string,
  message: string
): Promise<void> {
  await prisma.notification.create({
    data: { orderId, userId, type, message },
  });
}

/**
 * Notification message templates for each workflow step.
 */
export function notificationMessage(status: OrderStatus, orderNumber: string): string {
  const messages: Partial<Record<OrderStatus, string>> = {
    PENDING: `Order ${orderNumber} received. We will review availability shortly.`,
    UNDER_REVIEW: `Order ${orderNumber} is now under review. Our staff is checking availability.`,
    READY_FOR_CONFIRMATION: `Order ${orderNumber}: items have been checked. Please review availability and confirm your order.`,
    CONFIRMED: `Order ${orderNumber} confirmed. We will start packing shortly.`,
    PACKING: `Order ${orderNumber} is being packed.`,
    READY_FOR_DELIVERY: `Order ${orderNumber} is packed and ready for delivery.`,
    OUT_FOR_DELIVERY: `Order ${orderNumber} is out for delivery.`,
    DELIVERED: `Order ${orderNumber} has been delivered. Thank you!`,
    COMPLETED: `Order ${orderNumber} is complete. Thank you for shopping with AL-NASSIM.`,
    CANCELLED_BY_CUSTOMER: `Order ${orderNumber} has been cancelled.`,
    CANCELLED_BY_STAFF: `Order ${orderNumber} has been cancelled by our staff.`,
  };
  return messages[status] ?? `Order ${orderNumber} status updated to ${STATUS_LABELS[status]}.`;
}

/* ------------------------------------------------------------------ */
/* Concurrency-safe transition validation                              */
/* ------------------------------------------------------------------ */

/**
 * Lock the order row (SELECT … FOR UPDATE) inside a transaction and validate
 * the requested transition against the CURRENT committed status.
 *
 * Why: the status-mutation routes previously validated against a plain read
 * taken BEFORE the transaction. Two concurrent, individually-valid actions
 * (e.g. a customer cancelling while an admin confirms) could both pass
 * validation against the same stale status, both report success, and the
 * last write silently won — recording a transition that was never legal from
 * the state it actually overwrote.
 *
 * With the row lock, competing mutations serialize: the second request
 * re-reads the winner's committed status and its transition is validated
 * against reality, so exactly one valid transition wins and the loser
 * receives a TransitionError (→ HTTP 409). Stock restoration stays
 * exactly-once because it only runs for the request whose transition won.
 *
 * Returns the locked (current) status for logging/audit context.
 */
export async function lockAndValidateTransition(
  tx: Prisma.TransactionClient,
  orderId: number,
  toStatus: OrderStatus
): Promise<OrderStatus> {
  const rows = await tx.$queryRawUnsafe<Array<{ status: OrderStatus }>>(
    `SELECT "status" FROM "Order" WHERE "id" = $1 FOR UPDATE`,
    orderId
  );
  if (!rows.length) {
    throw new TransitionError("Order not found");
  }
  const current = rows[0].status;
  validateTransition(current, toStatus);
  return current;
}
