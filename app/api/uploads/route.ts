import { nanoid } from "nanoid";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { jsonError, requireFirebaseUserId } from "@/lib/server-api";

function extensionFromName(fileName: string): string {
  const parts = fileName.split(".");
  if (parts.length < 2) {
    return "bin";
  }
  return parts[parts.length - 1].toLowerCase();
}

export async function POST(request: Request) {
  const creatorUid = await requireFirebaseUserId(request);
  if (!creatorUid) {
    return jsonError("Unauthorized", 401);
  }

  const formData = await request.formData();
  const value = formData.get("file");

  if (!(value instanceof File)) {
    return jsonError("No file uploaded");
  }

  if (!value.type.startsWith("image/")) {
    return jsonError("Only image uploads are allowed");
  }

  if (value.size > 5 * 1024 * 1024) {
    return jsonError("Image is too large. Max size is 5MB.");
  }

  try {
    const supabase = createSupabaseServiceClient();
    const bucketName = process.env.SUPABASE_FORMS_BUCKET || "form-images";

    const ext = extensionFromName(value.name);
    const key = `${creatorUid}/${Date.now()}-${nanoid(8)}.${ext}`;
    const bytes = await value.arrayBuffer();

    const { error } = await supabase.storage.from(bucketName).upload(key, bytes, {
      contentType: value.type,
      upsert: false,
    });

    if (error) {
      return jsonError(error.message, 500);
    }

    const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(key);

    return Response.json({
      imageUrl: publicData.publicUrl,
      storagePath: key,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Upload failed", 500);
  }
}
