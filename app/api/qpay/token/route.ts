import { NextResponse } from "next/server";

export async function POST() {
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

  try {
    const response = await fetch(
      "https://merchant.qpay.mn/v2/auth/token",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: "QPay нэвтрэлт амжилтгүй", details: data },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "QPay сервертэй холбогдож чадсангүй" },
      { status: 500 }
    );
  }
}