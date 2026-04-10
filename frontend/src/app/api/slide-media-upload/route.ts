import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const ALLOWED = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
  "video/mp4", "video/webm",
  "application/pdf",
]);
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Dosya yok" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: `Desteklenmeyen dosya türü: ${file.type}` }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Dosya 50MB'tan büyük olamaz" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Oturum yok" }, { status: 401 });

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Organizasyon bulunamadı" }, { status: 400 });
    }

    // Unique path: org/user/timestamp_filename
    const safeName = file.name.replace(/[^a-z0-9.\-_]/gi, "_");
    const storagePath = `${profile.organization_id}/${user.id}/${Date.now()}_${safeName}`;

    const buf = await file.arrayBuffer();
    const { error: uploadErr } = await supabase.storage
      .from("slide-media")
      .upload(storagePath, buf, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) {
      console.error("upload error:", uploadErr);
      return NextResponse.json({ error: "Yükleme hatası: " + uploadErr.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("slide-media").getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    // Asset kaydı
    const assetType = file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("video/")
      ? "video"
      : "document";

    const { data: asset, error: assetErr } = await supabase
      .from("slide_media_assets")
      .insert({
        organization_id: profile.organization_id,
        uploaded_by: user.id,
        asset_type: assetType,
        file_name: file.name,
        storage_path: storagePath,
        public_url: publicUrl,
        file_size_bytes: file.size,
        mime_type: file.type,
      })
      .select()
      .single();

    if (assetErr) {
      console.warn("asset insert warning:", assetErr.message);
      // Yine de URL'yi dön
    }

    return NextResponse.json({
      url: publicUrl,
      path: storagePath,
      asset_id: asset?.id || null,
      asset_type: assetType,
    });
  } catch (err: any) {
    console.error("slide-media-upload error:", err);
    return NextResponse.json({ error: err?.message || "Hata" }, { status: 500 });
  }
}

export async function GET() {
  // Kullanıcının medya kütüphanesini listele
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Oturum yok" }, { status: 401 });

    const { data, error } = await supabase
      .from("slide_media_assets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ assets: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
