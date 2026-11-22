import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { createAdminSupabaseClient } from "@/lib/admin-supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await hasAdminSession(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Файл сонгоно уу." }, { status: 400 });
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      return NextResponse.json({ error: "Зөвхөн зураг эсвэл видео файл оруулна уу." }, { status: 400 });
    }
    const maxBytes = isVideo ? 50 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({
        error: isVideo ? "Видео 50MB-аас бага байх ёстой." : "Зураг 15MB-аас бага байх ёстой.",
      }, { status: 413 });
    }

    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || (isVideo ? "mp4" : "jpg");
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, file, { contentType: file.type, upsert: false });

    if (error) throw error;
    const { data } = supabase.storage.from("product-images").getPublicUrl(fileName);
    return NextResponse.json({ url: data.publicUrl, image: data.publicUrl, mediaType: isVideo ? "video" : "image" });
  } catch (error) {
    console.error("Admin media upload failed:", error);
    return NextResponse.json({ error: "Файл upload хийхэд алдаа гарлаа. Supabase Storage bucket-ийн тохиргоог шалгана уу." }, { status: 500 });
  }
}
