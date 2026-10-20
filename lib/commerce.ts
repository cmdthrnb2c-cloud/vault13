export type Availability = "IN_STOCK" | "PREORDER";

export function normalizeAvailability(value: unknown): Availability {
  return typeof value === "string" &&
    /pre.?order|захиал|урьдчилсан/i.test(value)
    ? "PREORDER"
    : "IN_STOCK";
}

export function parsePrice(value: unknown) {
  const price = typeof value === "number"
    ? value
    : Number(String(value ?? "").replace(/[^\d.]/g, ""));

  return Number.isSafeInteger(price) && price > 0 ? price : null;
}

export const PREORDER_ARRIVAL_DAYS = "6–9 хоног";

export const PREORDER_ORDER_STATUSES = [
  "Төлбөр хүлээгдэж байна",
  "Төлбөр баталгаажсан",
  "Нийлүүлэгчээс захиалсан",
  "Замд явж байна",
  "Монголд ирсэн",
  "Хүргэгдсэн",
  "Цуцлагдсан",
] as const;