import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { createAdminSupabaseClient } from "@/lib/admin-supabase";
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
  ) return null;

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

function validateProductUpdates(input: Record<string, unknown>) {
  const allowedFields = ["name", "category", "price", "image", "stock", "availability", "description"];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (Object.hasOwn(input, field)) updates[field] = input[field];
  }
  if (Object.keys(updates).length === 0) return null;

  if ("name" in updates) {
    if (typeof updates.name !== "string" || !updates.name.trim()) return null;
    updates.name = updates.name.trim();
  }
  if ("category" in updates) {
    if (typeof updates.category !== "string" || !updates.category.trim()) return null;
    updates.category = updates.category.trim();
  }
  if ("image" in updates) {
    if (typeof updates.image !== "string" || !updates.image.trim()) return null;
    updates.image = updates.image.trim();
  }
  if ("description" in updates && typeof updates.description !== "string") return null;
  if ("price" in updates) {
    const price = parsePrice(updates.price);
    if (price === null) return null;
    updates.price = price;
  }
  if ("stock" in updates) {
    const stock = Number(updates.stock);
    if (!Number.isSafeInteger(stock) || stock < 0) return null;
    updates.stock = stock;
  }
  if ("availability" in updates) {
    updates.availability = normalizeAvailability(updates.availability);
  }
  return updates;
}

export async function GET() {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ products: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Products request failed." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body: ProductInput;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid product data." }, { status: 400 });
    }
    const product = validateProduct(body);
    if (!product) {
      return NextResponse.json({ error: "Invalid product data." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .insert(product)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ product: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Product creation failed." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid product id." }, { status: 400 });
    }
    const updates = body.updates && typeof body.updates === "object"
      ? validateProductUpdates(body.updates)
      : validateProduct(body);
    if (!updates) {
      return NextResponse.json({ error: "Invalid product update." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, product: data });
  } catch {
    return NextResponse.json({ error: "Product update failed." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    if (id === undefined || id === null) {
      return NextResponse.json({ error: "Invalid product id." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Product deletion failed." }, { status: 500 });
  }
}