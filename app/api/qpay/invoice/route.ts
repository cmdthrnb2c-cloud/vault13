import { NextResponse } from "next/server";
import { verifyCheckoutToken } from "@/lib/checkout-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { createQPayInvoice, getQPayAccessToken } from "@/lib/qpay";

export async function POST(request: Request) {
  let body: { orderId?: unknown; checkoutToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Захиалгын мэдээлэл буруу байна." }, { status: 400 });
  }

  const orderId = String(body.orderId ?? "");
  if (!/^\d+$/.test(orderId) || typeof body.checkoutToken !== "string") {
    return NextResponse.json({ error: "Захиалгын дугаар буруу байна." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, total, payment_status, checkout_token_hash")
      .eq("id", Number(orderId))
      .single();

    if (orderError) throw orderError;
    if (!verifyCheckoutToken(body.checkoutToken, order.checkout_token_hash)) {
      return NextResponse.json({ error: "Захиалгын баталгаажуулалт буруу байна." }, { status: 403 });
    }
    if (order.payment_status !== "PENDING") {
      return NextResponse.json({ error: "Энэ захиалгын төлбөр хүлээгдээгүй байна." }, { status: 409 });
    }

    const accessToken = await getQPayAccessToken();
    const invoice = await createQPayInvoice(
      accessToken,
      orderId,
      Number(order.total)
    );

    const { error: updateError } = await supabase
      .from("orders")
      .update({ qpay_invoice_id: invoice.invoice_id })
      .eq("id", Number(orderId));
    if (updateError) throw updateError;

    return NextResponse.json(invoice);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "QPAY_CONFIGURATION") {
      return NextResponse.json({ error: "QPay тохиргоо дутуу байна." }, { status: 500 });
    }
    if (message.startsWith("QPAY_")) {
      const authFailed = message === "QPAY_AUTH_FAILED";
      return NextResponse.json(
        { error: authFailed ? "QPay нэвтрэлт амжилтгүй." : "QPay нэхэмжлэл үүсгэсэнгүй." },
        { status: 502 }
      );
    }
    return NextResponse.json({ error: "Захиалгын мэдээлэл уншиж чадсангүй." }, { status: 500 });
  }
}
