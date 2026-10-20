import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { createAdminSupabaseClient } from "@/lib/admin-supabase";

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "bin";
    const fileName = `${Date.now()}.${extension}`;
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, file, { contentType: file.type || undefined });

    if (error) throw error;
    const { data } = supabase.storage.from("product-images").getPublicUrl(fileName);
    return NextResponse.json({ image: data.publicUrl });
  } catch {
    return NextResponse.json({ error: "Image upload failed." }, { status: 500 });
  }
}