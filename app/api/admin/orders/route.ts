import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { PREORDER_ORDER_STATUSES } from "@/lib/commerce";

function withOverdueFlag<T extends {
  has_preorder?: boolean;
  expected_arrival_at?: string | null;
  order_status?: string;
}>(order: T) {
  const expectedArrivalAt = order.expected_arrival_at ? new Date(order.expected_arrival_at) : null;
  const hasPastExpectedArrival = Boolean(
    expectedArrivalAt &&
    Number.isFinite(expectedArrivalAt.getTime()) &&
    expectedArrivalAt.getTime() < Date.now()
  );

  return {
    ...order,
    is_overdue: Boolean(
      order.has_preorder &&
      hasPastExpectedArrival &&
      !["Хүргэгдсэн", "Цуцлагдсан"].includes(order.order_status ?? "")
    ),
  };
}

export async function GET(request: Request) {
  if (!hasAdminSession(request)) {
    return NextResponse.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("orders")
      .select("id, customer_name, customer_phone, customer_address, payment_method, payment_status, order_status, items, total, created_at, has_preorder, expected_arrival_at, inventory_issue")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ orders: (data ?? []).map(withOverdueFlag) });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Захиалга ачаалж чадсангүй.", details },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!hasAdminSession(request)) {
    return NextResponse.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  }

  let body: { id?: unknown; orderStatus?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Хүсэлтийн өгөгдөл буруу байна." }, { status: 400 });
  }

  const id = Number(body.id);
  const orderStatus = PREORDER_ORDER_STATUSES.find(
    (status) => status === body.orderStatus
  );
  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    !orderStatus
  ) {
    return NextResponse.json({ error: "Захиалгын төлөв буруу байна." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: order, error: readError } = await supabase
      .from("orders")
      .select("payment_status")
      .eq("id", id)
      .single();

    if (readError) throw readError;
    if (
      orderStatus !== "Төлбөр хүлээгдэж байна" &&
      orderStatus !== "Цуцлагдсан" &&
      order.payment_status !== "PAID"
    ) {
      return NextResponse.json(
        { error: "Төлбөр QPay-ээр баталгаажаагүй тул захиалгыг боловсруулах боломжгүй." },
        { status: 409 }
      );
    }
    if (
      orderStatus === "Төлбөр хүлээгдэж байна" &&
      order.payment_status === "PAID"
    ) {
      return NextResponse.json(
        { error: "Баталгаажсан төлбөрийн төлөвийг буцаах боломжгүй." },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("orders")
      .update({ order_status: orderStatus })
      .eq("id", id)
      .select("id, customer_name, customer_phone, customer_address, payment_method, payment_status, order_status, items, total, created_at, has_preorder, expected_arrival_at, inventory_issue")
      .single();

    if (error) throw error;
    return NextResponse.json({ order: withOverdueFlag(data) });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Захиалгын төлөв шинэчилж чадсангүй.", details },
      { status: 500 }
    );
  }
}
