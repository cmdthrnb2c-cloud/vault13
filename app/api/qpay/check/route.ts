import { NextResponse } from "next/server";
import { verifyCheckoutToken } from "@/lib/checkout-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { checkQPayInvoice, getQPayAccessToken } from "@/lib/qpay";

export async function POST(request: Request) {
  let body: { invoiceId?: unknown; orderId?: unknown; checkoutToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Төлбөрийн мэдээлэл буруу байна." }, { status: 400 });
  }

  const invoiceId = typeof body.invoiceId === "string" ? body.invoiceId : "";
  const orderId = Number(body.orderId);
  if (
    !invoiceId ||
    invoiceId.length > 200 ||
    typeof body.checkoutToken !== "string" ||
    !Number.isSafeInteger(orderId) ||
    orderId <= 0
  ) {
    return NextResponse.json({ error: "Нэхэмжлэлийн мэдээлэл дутуу байна." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, total, payment_status, qpay_invoice_id, inventory_issue, checkout_token_hash")
      .eq("id", orderId)
      .single();

    if (orderError) throw orderError;
    if (!verifyCheckoutToken(body.checkoutToken, order.checkout_token_hash)) {
      return NextResponse.json({ error: "Захиалгын баталгаажуулалт буруу байна." }, { status: 403 });
    }
    if (order.qpay_invoice_id !== invoiceId) {
      return NextResponse.json({ error: "Нэхэмжлэл энэ захиалгад хамаарахгүй байна." }, { status: 400 });
    }
    if (order.payment_status === "PAID") {
      return NextResponse.json({
        paid: true,
        paidAmount: Number(order.total),
        inventoryIssue: order.inventory_issue === true,
      });
    }
    if (order.payment_status !== "PENDING") {
      return NextResponse.json({ error: "Захиалгын төлөв төлбөр шалгах боломжгүй байна." }, { status: 409 });
    }

    const accessToken = await getQPayAccessToken();
    const payment = await checkQPayInvoice(accessToken, invoiceId);
    const total = Number(order.total);
    if (!payment.paid || payment.paidAmount < total) {
      return NextResponse.json({
        paid: false,
        paidAmount: payment.paidAmount,
      });
    }

    const { error: confirmError } = await supabase.rpc(
      "confirm_vault13_qpay_order",
      {
        p_order_id: orderId,
        p_invoice_id: invoiceId,
      }
    );
    if (confirmError) throw confirmError;

    const { data: confirmedOrder, error: verifyError } = await supabase
      .from("orders")
      .select("payment_status, total, inventory_issue")
      .eq("id", orderId)
      .single();
    if (verifyError) throw verifyError;

    if (confirmedOrder.payment_status !== "PAID") {
      return NextResponse.json({ error: "Төлбөрийн баталгаажуулалт хадгалагдсангүй." }, { status: 500 });
    }

    return NextResponse.json({
      paid: true,
      paidAmount: payment.paidAmount,
      inventoryIssue: confirmedOrder.inventory_issue === true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "QPAY_CONFIGURATION") {
      return NextResponse.json({ error: "QPay тохиргоо дутуу байна." }, { status: 500 });
    }
    if (message.startsWith("QPAY_")) {
      return NextResponse.json({ error: "QPay төлбөр шалгаж чадсангүй." }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Төлбөр шалгаж чадсангүй. Өгөгдлийн сангийн тохиргоог шалгана уу." },
      { status: 500 }
    );
  }
}
