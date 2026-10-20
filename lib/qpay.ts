import "server-only";

export async function getQPayAccessToken() {
  const clientId = process.env.QPAY_CLIENT_ID;
  const clientSecret = process.env.QPAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("QPAY_CONFIGURATION");

  const response = await fetch("https://merchant.qpay.mn/v2/auth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) throw new Error("QPAY_AUTH_FAILED");
  const data = (await response.json()) as { access_token?: unknown };
  if (typeof data.access_token !== "string" || !data.access_token) {
    throw new Error("QPAY_AUTH_FAILED");
  }
  return data.access_token;
}

export async function createQPayInvoice(
  accessToken: string,
  orderId: string,
  amount: number
) {
  const invoiceCode = process.env.QPAY_INVOICE_CODE;
  if (!invoiceCode) throw new Error("QPAY_CONFIGURATION");

  const response = await fetch("https://merchant.qpay.mn/v2/invoice", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      invoice_code: invoiceCode,
      sender_invoice_no: orderId,
      invoice_receiver_code: "terminal",
      invoice_description: `Vault13 захиалга ${orderId}`,
      amount,
      callback_url: "https://vault13-six.vercel.app/api/qpay/callback",
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error("QPAY_INVOICE_FAILED");
  const data = (await response.json()) as {
    invoice_id?: unknown;
    urls?: unknown;
    qr_image?: unknown;
  };
  if (typeof data.invoice_id !== "string" && typeof data.invoice_id !== "number") {
    throw new Error("QPAY_INVOICE_FAILED");
  }
  return { ...data, invoice_id: String(data.invoice_id) };
}

export async function checkQPayInvoice(accessToken: string, invoiceId: string) {
  const response = await fetch("https://merchant.qpay.mn/v2/payment/check", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      object_type: "INVOICE",
      object_id: invoiceId,
      offset: { page_number: 1, page_limit: 10 },
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error("QPAY_CHECK_FAILED");
  const payment = (await response.json()) as {
    paid_amount?: unknown;
    rows?: Array<{ payment_status?: unknown }>;
  };
  const paidAmount = Number(payment.paid_amount);
  return {
    paid: Array.isArray(payment.rows) &&
      payment.rows.some((row) => row.payment_status === "PAID"),
    paidAmount: Number.isFinite(paidAmount) ? paidAmount : 0,
  };
}
