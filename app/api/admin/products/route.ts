import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { normalizeAvailability, parsePrice } from "@/lib/commerce";

type ProductInput = {
  name?: unknown;
  category?: unknown;
  price?: unknown;
  image?: unknown;
  stock?: unknown;
  availability?: unknown;
  description?: unknown;
};

function validateProduct(input: ProductInput) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const category = typeof input.category === "string" ? input.category.trim() : "";
  const image = typeof input.image === "string" ? input.image.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const price = parsePrice(input.price);
  const stock = Number(input.stock);

  if (
    !name ||
    !category ||
    !image ||
    price === null ||
    !Number.isSafeInteger(stock) ||
    stock < 0
  ) {
    return null;
  }

  return {
    name,
    category,
    price,
    image,
    stock,
    availability: normalizeAvailability(input.availability),
    description,
  };
}

export async function GET(request: Request) {
  if (!hasAdminSession(request)) {
    return NextResponse.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const pageSize = 1000;
    const products = [];

    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;

      const page = data ?? [];
      products.push(...page);
      if (page.length < pageSize) break;
    }

    return NextResponse.json({ products });
   } catch (error) {
  const details = error instanceof Error ? error.message : String(error);
  return NextResponse.json(
    { error: "Бараа ачаалж чадсангүй.", details },
    { status: 500 }
  );
}
}

export async function POST(request: Request) {
  if (!hasAdminSession(request)) {
    return NextResponse.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  }

  let body: ProductInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Хүсэлтийн өгөгдөл буруу байна." }, { status: 400 });
  }

  const product = validateProduct(body);
  if (!product) {
    return NextResponse.json({ error: "Барааны мэдээлэл буруу байна." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("products")
      .insert(product)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ product: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Бараа хадгалж чадсангүй." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!hasAdminSession(request)) {
    return NextResponse.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  }

  let body: ProductInput & { id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Хүсэлтийн өгөгдөл буруу байна." }, { status: 400 });
  }

  const id = Number(body.id);
  const product = validateProduct(body);
  if (!Number.isSafeInteger(id) || id <= 0 || !product) {
    return NextResponse.json({ error: "Барааны мэдээлэл буруу байна." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("products")
      .update(product)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ product: data });
  } catch {
    return NextResponse.json({ error: "Бараа шинэчилж чадсангүй." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!hasAdminSession(request)) {
    return NextResponse.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  }

  let body: { id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Хүсэлтийн өгөгдөл буруу байна." }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Барааны дугаар буруу байна." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "Бараа устгаж чадсангүй." }, { status: 500 });
  }
}
