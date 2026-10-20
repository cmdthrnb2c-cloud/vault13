import { NextResponse } from "next/server";
import { createCheckoutToken, hashCheckoutToken } from "@/lib/checkout-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { normalizeAvailability, parsePrice } from "@/lib/commerce";

type CartRequestItem = {
  id?: unknown;
  quantity?: unknown;
};

type ProductRecord = {
  id: number;
  name: string;
  category: string;
  price: number | string;
  image: string;
  stock: number;
  availability?: string | null;
};

export async function POST(request: Request) {
  let body: {
    customerName?: unknown;
    customerPhone?: unknown;
    customerAddress?: unknown;
    items?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Захиалгын өгөгдөл буруу байна." }, { status: 400 });
  }

  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
  const customerPhone = typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
  const customerAddress = typeof body.customerAddress === "string" ? body.customerAddress.trim() : "";
  if (
    !customerName ||
    customerName.length > 120 ||
    !customerPhone ||
    customerPhone.length > 40 ||
    !customerAddress ||
    customerAddress.length > 500 ||
    !Array.isArray(body.items) ||
    body.items.length === 0 ||
    body.items.length > 50
  ) {
    return NextResponse.json({ error: "Хэрэглэгч болон барааны мэдээлэл дутуу байна." }, { status: 400 });
  }

  const requested = new Map<number, number>();
  for (const item of body.items as CartRequestItem[]) {
    const id = Number(item.id);
    const quantity = Number(item.quantity);
    if (
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      !Number.isSafeInteger(quantity) ||
      quantity <= 0 ||
      quantity > 99
    ) {
      return NextResponse.json({ error: "Сагсны барааны мэдээлэл буруу байна." }, { status: 400 });
    }
    const accumulatedQuantity = (requested.get(id) ?? 0) + quantity;
    if (accumulatedQuantity > 99) {
      return NextResponse.json(
        { error: "Нэг бараанаас хамгийн ихдээ 99 ширхэг захиалах боломжтой." },
        { status: 400 }
      );
    }
    requested.set(id, accumulatedQuantity);
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select("id, name, category, price, image, stock, availability")
      .in("id", [...requested.keys()]);

    if (error) throw error;
    const products = (data ?? []) as ProductRecord[];
    if (products.length !== requested.size) {
      return NextResponse.json({ error: "Сагсанд байхгүй болсон бараа байна." }, { status: 409 });
    }

    const items = [];
    for (const product of products) {
      const quantity = requested.get(product.id) ?? 0;
      const availability = normalizeAvailability(product.availability);
      if (
        availability === "IN_STOCK" &&
        (!Number.isSafeInteger(Number(product.stock)) || Number(product.stock) < quantity)
      ) {
        return NextResponse.json(
          { error: `${product.name} барааны үлдэгдэл хүрэлцэхгүй байна.` },
          { status: 409 }
        );
      }

      const price = parsePrice(product.price);
      if (price === null) {
        return NextResponse.json(
          { error: `${product.name} барааны үнэ буруу тохируулагдсан байна.` },
          { status: 409 }
        );
      }

      items.push({
        product_id: product.id,
        name: product.name,
        category: product.category,
        price,
        image: product.image,
        availability,
        quantity,
      });
    }

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (!Number.isSafeInteger(total) || total <= 0) {
      return NextResponse.json({ error: "Захиалгын нийт дүн буруу байна." }, { status: 400 });
    }

    const hasPreorder = items.some((item) => item.availability === "PREORDER");
    const checkoutToken = createCheckoutToken();
    const { data: order, error: insertError } = await supabase
      .from("orders")
      .insert({
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        payment_method: "QPAY",
        items,
        total,
        payment_status: "PENDING",
        order_status: "Төлбөр хүлээгдэж байна",
        has_preorder: hasPreorder,
        checkout_token_hash: hashCheckoutToken(checkoutToken),
      })
      .select("id, total")
      .single();

    if (insertError) throw insertError;
    return NextResponse.json(
      { orderId: order.id, total: order.total, items, checkoutToken },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Захиалга үүсгэж чадсангүй. Өгөгдлийн сангийн тохиргоог шалгана уу." },
      { status: 500 }
    );
  }
}
