// whatsapp-media-downloader — baixa mídia UAZAPI e persiste no Supabase Storage
// Chamado fire-and-forget pelo webhook ou sob demanda
//
// Body: { message_id: string, force?: boolean }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, uazapiMessageDownload } from "../_shared/whatsapp.ts";

const BUCKET = "whatsapp-media";
const MAX_RETRIES = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { message_id, force } = await req.json();
    if (!message_id) {
      return new Response(JSON.stringify({ ok: false, error: "message_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: media } = await supabase.from("whatsapp_media")
      .select("*")
      .eq("message_id", message_id)
      .maybeSingle();

    if (!media) {
      return new Response(JSON.stringify({ ok: false, error: "mídia não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Se já está ready e não é force, retorna
    if (media.status === "ready" && !force) {
      return new Response(JSON.stringify({ ok: true, status: "already_ready", media }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Se excedeu tentativas e não é force, marca como failed definitivo
    if ((media.tentativas ?? 0) >= MAX_RETRIES && !force) {
      await supabase.from("whatsapp_media")
        .update({ status: "failed", erro: "max_retries_exceeded" })
        .eq("id", media.id);
      return new Response(JSON.stringify({ ok: false, error: "max_retries_exceeded" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Marca como downloading
    await supabase.from("whatsapp_media")
      .update({
        status: "downloading",
        tentativas: (media.tentativas ?? 0) + 1,
      })
      .eq("id", media.id);

    // Busca instância pra pegar token
    const { data: instance } = await supabase.from("whatsapp_instances")
      .select("*")
      .eq("id", media.instance_id)
      .maybeSingle();

    if (!instance || !instance.token) {
      await markFailed(supabase, media.id, "instância sem token");
      return new Response(JSON.stringify({ ok: false, error: "instance_no_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca a mensagem pra pegar external_id
    const { data: msg } = await supabase.from("whatsapp_messages")
      .select("id, message_external_id, instance_id")
      .eq("id", message_id)
      .single();

    if (!msg?.message_external_id) {
      await markFailed(supabase, media.id, "mensagem sem external_id");
      return new Response(JSON.stringify({ ok: false, error: "no_external_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tenta 1: direct URL (media.origem_url)
    let buffer: ArrayBuffer | null = null;
    let contentType = media.mime_type || "application/octet-stream";

    if (media.origem_url) {
      try {
        const directRes = await fetch(media.origem_url, {
          headers: { Accept: "*/*" },
          signal: AbortSignal.timeout(30000),
        });
        if (directRes.ok) {
          buffer = await directRes.arrayBuffer();
          contentType = directRes.headers.get("content-type") || contentType;
        }
      } catch { /* fallback abaixo */ }
    }

    // Tenta 2: /message/download UAZAPI
    if (!buffer) {
      const serverUrl = instance.servidor_url || "https://trilhoassist.uazapi.com";
      const dl = await uazapiMessageDownload(instance.token, msg.message_external_id, serverUrl);
      if (dl.buffer) {
        buffer = dl.buffer;
        contentType = dl.mimeType || contentType;
      } else if (dl.data?.url || dl.data?.fileURL) {
        // UAZAPI retornou URL pra baixar
        const url = dl.data.url ?? dl.data.fileURL;
        const r2 = await fetch(url);
        if (r2.ok) {
          buffer = await r2.arrayBuffer();
          contentType = r2.headers.get("content-type") || contentType;
        }
      } else if (dl.data?.base64) {
        // UAZAPI retornou base64
        const bin = atob(dl.data.base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        buffer = bytes.buffer;
        contentType = dl.data.mimetype || contentType;
      }
    }

    if (!buffer) {
      await markFailed(supabase, media.id, "não conseguiu baixar de nenhuma fonte");
      return new Response(JSON.stringify({ ok: false, error: "download_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calcula sha256
    const sha256Hash = await sha256(buffer);

    // Dedup: se já existe arquivo com mesmo hash, só referencia
    const { data: existingHash } = await supabase.from("whatsapp_media")
      .select("storage_path, public_url, file_name, mime_type, size_bytes, thumbnail_path, thumbnail_url, duration_seconds, width, height")
      .eq("sha256", sha256Hash)
      .eq("status", "ready")
      .neq("id", media.id)
      .limit(1)
      .maybeSingle();

    if (existingHash) {
      await supabase.from("whatsapp_media").update({
        status: "ready",
        sha256: sha256Hash,
        storage_path: existingHash.storage_path,
        public_url: existingHash.public_url,
        file_name: existingHash.file_name ?? media.file_name,
        mime_type: existingHash.mime_type ?? contentType,
        size_bytes: existingHash.size_bytes ?? buffer.byteLength,
        thumbnail_path: existingHash.thumbnail_path,
        thumbnail_url: existingHash.thumbnail_url,
        duration_seconds: existingHash.duration_seconds,
        width: existingHash.width,
        height: existingHash.height,
        baixado_em: new Date().toISOString(),
      }).eq("id", media.id);
      return new Response(JSON.stringify({ ok: true, dedup: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload pro Storage
    const ext = mimeToExt(contentType);
    const yyyymm = new Date().toISOString().slice(0, 7);
    const storagePath = `${media.instance_id}/${yyyymm}/${media.id}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, new Uint8Array(buffer), {
        contentType,
        upsert: true,
      });

    if (uploadErr) {
      await markFailed(supabase, media.id, `upload: ${uploadErr.message}`);
      return new Response(JSON.stringify({ ok: false, error: uploadErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gera signed URL (válida por 7 dias, renovável)
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

    const publicUrl = signed?.signedUrl ?? null;

    // Atualiza registro final
    await supabase.from("whatsapp_media").update({
      status: "ready",
      sha256: sha256Hash,
      storage_path: storagePath,
      public_url: publicUrl,
      mime_type: contentType,
      size_bytes: buffer.byteLength,
      baixado_em: new Date().toISOString(),
      erro: null,
    }).eq("id", media.id);

    return new Response(JSON.stringify({ ok: true, storage_path: storagePath, public_url: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function markFailed(supabase: any, mediaId: string, erro: string) {
  await supabase.from("whatsapp_media")
    .update({ status: "failed", erro })
    .eq("id", mediaId);
}

async function sha256(buffer: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function mimeToExt(mime: string): string {
  const m = String(mime || "").toLowerCase();
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  if (m.includes("mp4")) return "mp4";
  if (m.includes("webm")) return "webm";
  if (m.includes("mov") || m.includes("quicktime")) return "mov";
  if (m.includes("mpeg") && m.includes("audio")) return "mp3";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("opus")) return "opus";
  if (m.includes("wav")) return "wav";
  if (m.includes("pdf")) return "pdf";
  if (m.includes("msword")) return "doc";
  if (m.includes("wordprocessingml")) return "docx";
  if (m.includes("spreadsheetml")) return "xlsx";
  if (m.includes("ms-excel")) return "xls";
  if (m.includes("text/plain")) return "txt";
  if (m.includes("zip")) return "zip";
  return "bin";
}
