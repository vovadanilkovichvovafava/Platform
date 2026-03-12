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

/**
 * Create a signed URL that allows the client to upload directly to Supabase Storage.
 * This bypasses the Next.js server entirely — no memory or body-size limits.
 */
export async function createSignedUploadUrl(filePath: string): Promise<{ signedUrl: string; token: string; path: string }> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUploadUrl(filePath)

  if (error || !data) {
    throw new Error(`Failed to create signed upload URL: ${error?.message || "unknown error"}`)
  }

  return { signedUrl: data.signedUrl, token: data.token, path: data.path }
}

/**
 * Upload a file from server (Buffer) — used after compression to re-upload the result.
 */
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

/**
 * Download a file from Supabase Storage to a Buffer (for server-side processing).
 */
export async function downloadMedia(filePath: string): Promise<Buffer> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(filePath)

  if (error || !data) {
    throw new Error(`Download failed: ${error?.message || "unknown error"}`)
  }

  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
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

export async function moveMedia(fromPath: string, toPath: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage.from(BUCKET_NAME).move(fromPath, toPath)
  if (error) {
    throw new Error(`Move failed: ${error.message}`)
  }
}
