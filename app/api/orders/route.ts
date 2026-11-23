import { NextResponse } from "next/server";
import { createCheckoutToken, hashCheckoutToken } from "@/lib/checkout-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { normalizeAvailability, parsePrice } from "@/lib/commerce";

type CartRequestItem = {
  id?: unknown;
  quantity?: unknown;
  variantColor?: unknown;
  variantSize?: unknown;
};

type ProductVariant = {
  color: string;
  price?: number;
  images: string[];
  availability: "IN_STOCK" | "PREORDER";
  sizes: { size: string; stock: number }[];
};

type ProductRecord = {
  id: number;
  name: string;
  category: string;
  price: number | string;
  image: string;
  stock: number;
  availability?: string | null;
  variants?: ProductVariant[] | null;
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
    !customerName || customerName.length > 120 ||
    !customerPhone || customerPhone.length > 40 ||
    !customerAddress || customerAddress.length > 500 ||
    !Array.isArray(body.items) || body.items.length === 0 || body.items.length > 50
  ) {
    return NextResponse.json({ error: "Хэрэглэгч болон барааны мэдээлэл дутуу байна." }, { status: 400 });
  }

  const requestedItems = body.items as CartRequestItem[];
  const productIds = new Set<number>();

  for (const item of requestedItems) {
    const id = Number(item.id);
    const quantity = Number(item.quantity);

    if (!Number.isSafeInteger(id) || id <= 0 ||
        !Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 99) {
      return NextResponse.json({ error: "Сагсны барааны мэдээлэл буруу байна." }, { status: 400 });
    }

    productIds.add(id);
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select("id, name, category, price, image, stock, availability, variants")
      .in("id", [...productIds]);

    if (error) throw error;

    const products = (data ?? []) as ProductRecord[];
    if (products.length !== productIds.size) {
      return NextResponse.json({ error: "Сагсанд байхгүй болсон бараа байна." }, { status: 409 });
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    const items = [];
    const requestedStock = new Map<string, number>();

    for (const requested of requestedItems) {
      const product = productMap.get(Number(requested.id));
      if (!product) {
        return NextResponse.json({ error: "Бараа олдсонгүй." }, { status: 409 });
      }

      const quantity = Number(requested.quantity);
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const variantCategory = ["CLOTHING", "FOOTWEAR"].includes(product.category);
      let availability = normalizeAvailability(product.availability);
      let price = parsePrice(product.price);
      let image = product.image;
      let variantColor: string | null = null;
      let variantSize: string | null = null;

      if (variantCategory && variants.length > 0) {
        const color = typeof requested.variantColor === "string" ? requested.variantColor.trim() : "";
        const size = typeof requested.variantSize === "string" ? requested.variantSize.trim() : "";

        if (!color || !size) {
          return NextResponse.json({ error: `${product.name}: өнгө болон размер сонгоно уу.` }, { status: 400 });
        }

        const variant = variants.find((entry) => entry.color === color);
        if (!variant) {
          return NextResponse.json({ error: `${product.name}: сонгосон өнгө олдсонгүй.` }, { status: 409 });
        }

        const sizeEntry = variant.sizes?.find((entry) => entry.size === size);
        if (!sizeEntry) {
          return NextResponse.json({ error: `${product.name}: сонгосон размер олдсонгүй.` }, { status: 409 });
        }

        availability = normalizeAvailability(variant.availability);
        if (variant.availability === "PREORDER") availability = "PREORDER";

        if (availability === "IN_STOCK") {
          const stockKey = `${product.id}:${color}:${size}`;
          const accumulated = (requestedStock.get(stockKey) ?? 0) + quantity;
          if (!Number.isSafeInteger(Number(sizeEntry.stock)) || Number(sizeEntry.stock) < accumulated) {
            return NextResponse.json(
              { error: `${product.name} / ${color} / ${size}: үлдэгдэл хүрэлцэхгүй байна.` },
              { status: 409 }
            );
          }
          requestedStock.set(stockKey, accumulated);
        }

        if (variant.price !== undefined) {
          price = parsePrice(variant.price);
        }
        image = variant.images?.[0] || product.image;
        variantColor = color;
        variantSize = size;
      } else {
        if (availability === "IN_STOCK") {
          const stockKey = `product:${product.id}`;
          const accumulated = (requestedStock.get(stockKey) ?? 0) + quantity;
          if (!Number.isSafeInteger(Number(product.stock)) || Number(product.stock) < accumulated) {
            return NextResponse.json(
              { error: `${product.name} барааны үлдэгдэл хүрэлцэхгүй байна.` },
              { status: 409 }
            );
          }
          requestedStock.set(stockKey, accumulated);
        }
      }

      if (price === null || price <= 0) {
        return NextResponse.json({ error: `${product.name} барааны үнэ буруу тохируулагдсан байна.` }, { status: 409 });
      }

      items.push({
        product_id: product.id,
        name: product.name,
        category: product.category,
        price,
        image,
        availability,
        quantity,
        variant_color: variantColor,
        variant_size: variantSize,
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
  } catch (error) {
    console.error("[orders] Захиалга үүсгэхэд алдаа гарлаа:", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Захиалга үүсгэж чадсангүй. Өгөгдлийн сангийн тохиргоог шалгана уу." },
      { status: 500 }
    );
  }
}
