
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { invoiceId } = await request.json();

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Нэхэмжлэлийн дугаар дутуу байна" },
        { status: 400 }
      );
    }

    const clientId = process.env.QPAY_CLIENT_ID;
    const clientSecret = process.env.QPAY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "QPay тохиргоо дутуу байна" },
        { status: 500 }
      );
    }

    const credentials = Buffer.from(
      `${clientId}:${clientSecret}`
    ).toString("base64");

    const tokenResponse = await fetch(
      "https://merchant.qpay.mn/v2/auth/token",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      return NextResponse.json(
        { error: "QPay нэвтрэлт амжилтгүй" },
        { status: 502 }
      );
    }

    const paymentResponse = await fetch(
      "https://merchant.qpay.mn/v2/payment/check",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          object_type: "INVOICE",
          object_id: invoiceId,
          offset: {
            page_number: 1,
            page_limit: 10,
          },
        }),
      }
    );

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok) {
      return NextResponse.json(
        { error: "QPay төлбөр шалгаж чадсангүй" },
        { status: 502 }
      );
    }

    const paid = Array.isArray(paymentData.rows) &&
      paymentData.rows.some(
        (row: { payment_status?: string }) =>
          row.payment_status === "PAID"
      );

    return NextResponse.json({
      paid,
      paidAmount: Number(paymentData.paid_amount || 0),
    });
  } catch {
    return NextResponse.json(
      { error: "Серверийн алдаа гарлаа" },
      { status: 500 }
    );
  }
}
