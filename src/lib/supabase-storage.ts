import { createClient } from "@supabase/supabase-js"

const BUCKET_NAME = "media"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars")
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}

export async function uploadMedia(
  buffer: Buffer,
  filePath: string,
  contentType: string
): Promise<string> {
  const supabase = getSupabaseAdmin()

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType,
      upsert: true,
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  return filePath
}

export function getMediaPublicUrl(filePath: string): string {
  const supabase = getSupabaseAdmin()
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath)
  return data.publicUrl
}

export async function deleteMedia(filePath: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath])
  if (error) {
    console.error(`Delete failed for ${filePath}: ${error.message}`)
  }
}
