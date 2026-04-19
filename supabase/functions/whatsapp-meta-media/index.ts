// whatsapp-meta-media — upload/download/cache/delete de mídia Meta
//
// Body: { instance_id, action, ...params }
// Actions:
//   - upload:   { file_url, mime_type }         // baixa da URL e sobe pro /media da Meta
//   - get_url:  { media_id }                    // pega URL temporária (5min)
//   - cache:    { media_id, force? }            // baixa e cacheia no Storage
//   - delete:   { media_id }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, bad } from "../_shared/whatsapp.ts";
import * as meta from "../_shared/providers/meta.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return bad("Method not allowed", 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    const { instance_id, action } = body;
    if (!instance_id) return bad("instance_id obrigatório");
    if (!action) return bad("action obrigatória");

    const { data: instance } = await supabase.from("whatsapp_instances")
      .select("*").eq("id", instance_id).maybeSingle();
    if (!instance) return bad("instância não encontrada", 404);
    if (instance.tipo !== "meta_oficial") return bad("instância não é Meta oficial", 400);

    const cfg = (instance.meta_config || {}) as meta.MetaConfig;

    switch (action) {
      case "upload": {
        const { file_url, mime_type } = body;
        if (!file_url || !mime_type) return bad("file_url e mime_type obrigatórios");
        const resp = await fetch(file_url);
        if (!resp.ok) return bad(`Falha baixando file_url: HTTP ${resp.status}`, 502);
        const blob = await resp.blob();
        const r = await meta.metaUploadMedia(cfg, blob, mime_type);
        return json({ success: r.ok, data: r.data, error: r.error }, r.ok ? 200 : 502);
      }

      case "get_url": {
        const { media_id } = body;
        if (!media_id) return bad("media_id obrigatório");
        const r = await meta.metaGetMediaUrl(cfg, media_id);
        return json({ success: r.ok, data: r.data, error: r.error }, r.ok ? 200 : 502);
      }

      case "cache": {
        const { media_id, force } = body;
        if (!media_id) return bad("media_id obrigatório");

        if (!force) {
          const { data: cached } = await supabase
            .from("whatsapp_meta_media_cache")
            .select("*")
            .eq("media_id", media_id)
            .maybeSingle();
          if (cached?.storage_path) {
            const { data: signed } = await supabase.storage
              .from("whatsapp-media")
              .createSignedUrl(cached.storage_path, 60 * 60 * 24 * 7);
            return json({ success: true, cached: true, url: signed?.signedUrl, cache: cached });
          }
        }

        const urlRes = await meta.metaGetMediaUrl(cfg, media_id);
        if (!urlRes.ok || !urlRes.data?.url) {
          return json({ success: false, error: urlRes.error }, 502);
        }
        const dl = await meta.metaDownloadMedia(cfg, urlRes.data.url);
        if (!dl.ok || !dl.buffer) return bad("falha no download", 502);

        const mime = dl.mimeType ?? urlRes.data.mime_type ?? "application/octet-stream";
        const ext = mimeToExt(mime);
        const storagePath = `meta/${instance_id}/${media_id}${ext}`;

        const { error: upErr } = await supabase.storage
          .from("whatsapp-media")
          .upload(storagePath, new Uint8Array(dl.buffer), { contentType: mime, upsert: true });
        if (upErr) return bad(`storage: ${upErr.message}`, 500);

        await supabase.from("whatsapp_meta_media_cache").upsert({
          media_id,
          storage_path: storagePath,
          mime_type: mime,
          file_size: urlRes.data.file_size ?? null,
          sha256: urlRes.data.sha256 ?? null,
          ttl_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

        const { data: signed } = await supabase.storage
          .from("whatsapp-media").createSignedUrl(storagePath, 60 * 60 * 24 * 7);
        return json({ success: true, url: signed?.signedUrl, storage_path: storagePath });
      }

      case "delete": {
        const { media_id } = body;
        if (!media_id) return bad("media_id obrigatório");
        const r = await meta.metaDeleteMedia(cfg, media_id);
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      default:
        return bad(`ação desconhecida: ${action}`);
    }
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});

function mimeToExt(mime: string): string {
  if (mime.startsWith("image/jpeg")) return ".jpg";
  if (mime.startsWith("image/png")) return ".png";
  if (mime.startsWith("image/webp")) return ".webp";
  if (mime.startsWith("video/mp4")) return ".mp4";
  if (mime.startsWith("audio/ogg")) return ".ogg";
  if (mime.startsWith("audio/mpeg")) return ".mp3";
  if (mime.startsWith("audio/amr")) return ".amr";
  if (mime.includes("pdf")) return ".pdf";
  return "";
}
