import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { createAdminSupabaseClient } from "@/lib/admin-supabase";

export const runtime = "nodejs";

const allowedKeys = new Set([
  "watch_hero",
  "culture_hero",
  "culture_music_merch",
  "culture_footwear",
  "culture_clothing",
  "culture_film_cinema",
  "culture_music_vinyl",
  "culture_accessories",
]);

// Public storefront reads only the curated image URL map; writes remain admin-only.
export async function GET() {
  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("storefront_media")
      .select("key, url");
    if (error) throw error;
    const media = Object.fromEntries((data ?? []).map((item) => [item.key, item.url]));
    return NextResponse.json({ media }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Storefront media read failed:", error);
    return NextResponse.json({ media: {} }, { status: 200 });
  }
}

export async function POST(request: Request) {
  if (!(await hasAdminSession(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const key = String(body?.key ?? "");
    const url = String(body?.url ?? "");
    if (!allowedKeys.has(key) || !/^https:\/\//i.test(url)) {
      return NextResponse.json({ error: "Зургийн тохиргоо буруу байна." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from("storefront_media")
      .upsert({ key, url, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Storefront media save failed:", error);
    return NextResponse.json({ error: "Зургийн тохиргоог хадгалж чадсангүй." }, { status: 500 });
  }
}
