
import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { normalizeAvailability, parsePrice } from "@/lib/commerce";

type ProductInput = {
  id?: unknown;
  name?: unknown;
  category?: unknown;
  price?: unknown;
  image?: unknown;
  images?: unknown;
  videos?: unknown;
  store?: unknown;
  stock?: unknown;
  availability?: unknown;
  description?: unknown;
  variants?: unknown;
  updates?: Record<string, unknown>;
};

function validUrlArray(value: unknown) {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "string");
}

function validVariants(value: unknown) {
  if (!Array.isArray(value)) return false;

  return value.every((variant) => {
    if (!variant || typeof variant !== "object") return false;
    const item = variant as Record<string, unknown>;

    if (
      typeof item.color !== "string" ||
      !item.color.trim() ||
      !Array.isArray(item.images) ||
      !item.images.every((url) => typeof url === "string") ||
      !Array.isArray(item.sizes) ||
      !["IN_STOCK", "PREORDER"].includes(String(item.availability))
    ) return false;

    if (
      item.price !== undefined &&
      (!Number.isSafeInteger(Number(item.price)) || Number(item.price) <= 0)
    ) return false;

    return item.sizes.every((size) => {
      if (!size || typeof size !== "object") return false;
      const entry = size as Record<string, unknown>;
      return typeof entry.size === "string" &&
        !!entry.size.trim() &&
        Number.isSafeInteger(Number(entry.stock)) &&
        Number(entry.stock) >= 0;
    });
  });
}

function validateProduct(input: ProductInput) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const category = typeof input.category === "string" ? input.category.trim() : "";
  const images = Array.isArray(input.images) ? input.images : [];
  const image = typeof input.image === "string"
    ? input.image.trim()
    : typeof images[0] === "string" ? images[0] : "";
  const videos = Array.isArray(input.videos) ? input.videos : [];
  const description = typeof input.description === "string"
    ? input.description.trim()
    : "";
  const price = parsePrice(input.price);
  const stock = Number(input.stock);

  if (
    !name || !category || !image ||
    price === null ||
    !Number.isSafeInteger(stock) || stock < 0 ||
    (input.store !== undefined &&
      input.store !== "watches" && input.store !== "culture") ||
    (input.images !== undefined && !validUrlArray(input.images)) ||
    (input.videos !== undefined && !validUrlArray(input.videos)) ||
    (input.variants !== undefined && (
      !["CLOTHING", "FOOTWEAR"].includes(category) ||
      !validVariants(input.variants)
    ))
  ) {
    return null;
  }

  return {
    name,
    category,
    price,
    image,
    images: images.length ? images : [image],
    videos,
    stock,
    availability: normalizeAvailability(input.availability),
    description,
    ...(input.variants !== undefined ? { variants: input.variants } : {}),
    ...(input.store === "watches" || input.store === "culture"
      ? { store: input.store }
      : {}),
  };
}

export async function GET(request: Request) {
  if (!hasAdminSession(request)) {
    return NextResponse.json(
      { error: "Нэвтрэх шаардлагатай." },
      { status: 401 }
    );
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ products: data ?? [] });
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
    return NextResponse.json(
      { error: "Нэвтрэх шаардлагатай." },
      { status: 401 }
    );
  }

  let body: ProductInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Хүсэлтийн өгөгдөл буруу байна." },
      { status: 400 }
    );
  }

  const product = validateProduct(body);
  if (!product) {
    return NextResponse.json(
      { error: "Барааны мэдээлэл буруу байна." },
      { status: 400 }
    );
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
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Бараа хадгалж чадсангүй.", details },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!hasAdminSession(request)) {
    return NextResponse.json(
      { error: "Нэвтрэх шаардлагатай." },
      { status: 401 }
    );
  }

  let body: ProductInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Хүсэлтийн өгөгдөл буруу байна." },
      { status: 400 }
    );
  }

  const id = Number(body.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "Барааны дугаар буруу байна." },
      { status: 400 }
    );
  }

  const source = body.updates ?? body;
  const updates: Record<string, unknown> = {};

  if ("name" in source) {
    if (typeof source.name !== "string" || !source.name.trim()) {
      return NextResponse.json({ error: "Барааны нэр буруу байна." }, { status: 400 });
    }
    updates.name = source.name.trim();
  }

  if ("category" in source) {
    if (typeof source.category !== "string" || !source.category.trim()) {
      return NextResponse.json({ error: "Ангилал буруу байна." }, { status: 400 });
    }
    updates.category = source.category.trim();
  }

  if ("price" in source) {
    const price = parsePrice(source.price);
    if (price === null) {
      return NextResponse.json({ error: "Үнэ буруу байна." }, { status: 400 });
    }
    updates.price = price;
  }

  if ("stock" in source) {
    const stock = Number(source.stock);
    if (!Number.isSafeInteger(stock) || stock < 0) {
      return NextResponse.json({ error: "Үлдэгдэл буруу байна." }, { status: 400 });
    }
    updates.stock = stock;
  }

  if ("image" in source) {
    if (typeof source.image !== "string") {
      return NextResponse.json({ error: "Зургийн URL буруу байна." }, { status: 400 });
    }
    updates.image = source.image;
  }

  if ("images" in source) {
    if (!validUrlArray(source.images)) {
      return NextResponse.json({ error: "Зургийн жагсаалт буруу байна." }, { status: 400 });
    }
    updates.images = source.images;
  }

  if ("videos" in source) {
    if (!validUrlArray(source.videos)) {
      return NextResponse.json({ error: "Видеоны жагсаалт буруу байна." }, { status: 400 });
    }
    updates.videos = source.videos;
  }

  if ("description" in source) {
    if (typeof source.description !== "string") {
      return NextResponse.json({ error: "Тайлбар буруу байна." }, { status: 400 });
    }
    updates.description = source.description.trim();
  }

  if ("variants" in source) {
    if (
      !["CLOTHING", "FOOTWEAR"].includes(String(source.category ?? "")) ||
      !validVariants(source.variants)
    ) {
      return NextResponse.json(
        { error: "Өнгө, размерын мэдээлэл буруу байна." },
        { status: 400 }
      );
    }
    updates.variants = source.variants;
  }

  if ("availability" in source) {
    updates.availability = normalizeAvailability(source.availability);
  }

  if ("store" in source) {
    if (source.store !== "watches" && source.store !== "culture") {
      return NextResponse.json({ error: "Дэлгүүрийн төрөл буруу байна." }, { status: 400 });
    }
    updates.store = source.store;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "Шинэчлэх мэдээлэл алга." },
      { status: 400 }
    );
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ product: data });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Бараа шинэчилж чадсангүй.", details },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!hasAdminSession(request)) {
    return NextResponse.json(
      { error: "Нэвтрэх шаардлагатай." },
      { status: 401 }
    );
  }

  let body: { id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Хүсэлтийн өгөгдөл буруу байна." },
      { status: 400 }
    );
  }

  const id = Number(body.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "Барааны дугаар буруу байна." },
      { status: 400 }
    );
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Бараа устгаж чадсангүй.", details },
      { status: 500 }
    );
  }
}
