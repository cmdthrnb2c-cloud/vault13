
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { amount, orderId } = await request.json();

    if (!amount || Number(amount) <= 0 || !orderId) {
      return NextResponse.json(
        { error: "Төлбөрийн дүн эсвэл захиалгын дугаар буруу байна" },
        { status: 400 }
      );
    }

    const clientId = process.env.QPAY_CLIENT_ID;
    const clientSecret = process.env.QPAY_CLIENT_SECRET;
    const invoiceCode = process.env.QPAY_INVOICE_CODE;

    if (!clientId || !clientSecret || !invoiceCode) {
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

    const invoiceResponse = await fetch(
      "https://merchant.qpay.mn/v2/invoice",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoice_code: invoiceCode,
          sender_invoice_no: String(orderId),
          invoice_receiver_code: "terminal",
          invoice_description: `Vault13 захиалга ${orderId}`,
          amount: Number(amount),
          callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/qpay/callback`,
        }),
      }
    );

    const invoiceData = await invoiceResponse.json();

    if (!invoiceResponse.ok) {
      return NextResponse.json(
        { error: "QPay нэхэмжлэл үүсгэсэнгүй", details: invoiceData },
        { status: invoiceResponse.status }
      );
    }

    return NextResponse.json(invoiceData);
  } catch {
    return NextResponse.json(
      { error: "Серверийн алдаа гарлаа" },
      { status: 500 }
    );
  }
}
