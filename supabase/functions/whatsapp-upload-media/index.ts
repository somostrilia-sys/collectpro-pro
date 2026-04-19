// whatsapp-upload-media — upload de arquivo do frontend pro Supabase Storage
// Retorna URL assinada pra usar em /send/media
//
// Body (multipart ou JSON):
//   - JSON: { instance_id, file_name, mime_type, base64 }
//   - Multipart: instance_id + file (campo "file")

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, bad } from "../_shared/whatsapp.ts";

const BUCKET = "whatsapp-media";
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return bad("Method not allowed", 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    let instanceId: string | null = null;
    let fileName: string = "arquivo";
    let mimeType: string = "application/octet-stream";
    let buffer: Uint8Array | null = null;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      instanceId = String(form.get("instance_id") || "");
      const file = form.get("file") as File | null;
      if (!file) return bad("file obrigatório");
      fileName = file.name || "arquivo";
      mimeType = file.type || "application/octet-stream";
      const ab = await file.arrayBuffer();
      buffer = new Uint8Array(ab);
    } else {
      const body = await req.json();
      instanceId = body.instance_id;
      fileName = body.file_name || "arquivo";
      mimeType = body.mime_type || "application/octet-stream";
      const b64 = body.base64 || "";
      const clean = b64.replace(/^data:[^;]+;base64,/, "");
      const bin = atob(clean);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      buffer = bytes;
    }

    if (!instanceId) return bad("instance_id obrigatório");
    if (!buffer) return bad("conteúdo do arquivo inválido");
    if (buffer.byteLength > MAX_BYTES) return bad("arquivo excede 50 MB", 413);

    // Confirmar instância existe
    const { data: instance } = await supabase.from("whatsapp_instances")
      .select("id").eq("id", instanceId).maybeSingle();
    if (!instance) return bad("instância não encontrada", 404);

    // Path de upload
    const yyyymm = new Date().toISOString().slice(0, 7);
    const rand = crypto.randomUUID();
    const ext = fileName.split(".").pop()?.toLowerCase() || mimeToExt(mimeType);
    const storagePath = `${instanceId}/${yyyymm}/outgoing/${rand}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });
    if (uploadErr) return bad(`upload: ${uploadErr.message}`, 500);

    // Gerar signed URL (7 dias)
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

    return json({
      success: true,
      storage_path: storagePath,
      public_url: signed?.signedUrl ?? null,
      file_name: fileName,
      mime_type: mimeType,
      size_bytes: buffer.byteLength,
    });
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});

function mimeToExt(mime: string): string {
  const m = String(mime || "").toLowerCase();
  if (m.includes("jpeg")) return "jpg";
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  if (m.includes("mp4")) return "mp4";
  if (m.includes("webm")) return "webm";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("mp3") || m.includes("mpeg")) return "mp3";
  if (m.includes("pdf")) return "pdf";
  return "bin";
}
