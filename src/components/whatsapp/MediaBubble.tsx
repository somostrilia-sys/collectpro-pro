import { useState } from "react";
import { FileText, Download, Play, Loader2, AlertCircle, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { WhatsAppMedia } from "@/types/whatsapp";
import { cn } from "@/lib/utils";

interface Props {
  media: WhatsAppMedia | null | undefined;
  caption?: string | null;
  fallbackType?: string;
  fallbackUrl?: string | null;
  onRetry?: () => void;
}

function humanSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MediaBubble({ media, caption, fallbackType, fallbackUrl, onRetry }: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Estado: pending/downloading → loading
  if (media && (media.status === "pending" || media.status === "downloading")) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-black/5 dark:bg-white/5 px-3 py-2.5 my-1 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Baixando mídia...</span>
      </div>
    );
  }

  if (media && media.status === "failed") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2 my-1 text-xs text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span className="flex-1">Falha ao baixar mídia</span>
        {onRetry && (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onRetry}>
            Tentar de novo
          </Button>
        )}
      </div>
    );
  }

  const mime = media?.mime_type || "";
  const url = media?.public_url || fallbackUrl;
  const type = fallbackType || (mime.startsWith("image/") ? "image"
    : mime.startsWith("audio/") ? "audio"
    : mime.startsWith("video/") ? "video"
    : "document");

  if (!url) return null;

  // IMAGEM
  if (type === "image" || mime.startsWith("image/")) {
    return (
      <>
        <div className="my-0.5">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="block overflow-hidden rounded-lg max-w-[280px] hover:opacity-90 transition-opacity"
          >
            <img
              src={url}
              alt={caption || "Imagem"}
              className="w-full h-auto max-h-72 object-cover"
              loading="lazy"
            />
          </button>
          {caption && <p className="text-sm whitespace-pre-wrap mt-1 break-words">{caption}</p>}
        </div>
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-1 bg-black/90 border-0">
            <img src={url} alt={caption || ""} className="max-w-full max-h-[85vh] object-contain mx-auto" />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // VÍDEO
  if (type === "video" || mime.startsWith("video/")) {
    return (
      <div className="my-0.5">
        <video
          controls
          className="max-w-[320px] max-h-72 rounded-lg"
          poster={media?.thumbnail_url ?? undefined}
        >
          <source src={url} type={mime || undefined} />
          Seu navegador não suporta vídeo.
        </video>
        {caption && <p className="text-sm whitespace-pre-wrap mt-1 break-words">{caption}</p>}
      </div>
    );
  }

  // ÁUDIO
  if (type === "audio" || mime.startsWith("audio/")) {
    return (
      <div className="flex items-center gap-2 my-0.5 min-w-[240px]">
        <audio controls className="h-10 max-w-full">
          <source src={url} type={mime || undefined} />
        </audio>
        {media?.duration_seconds && (
          <span className="text-[10px] text-muted-foreground">{formatDuration(media.duration_seconds)}</span>
        )}
      </div>
    );
  }

  // STICKER
  if (type === "sticker" || mime === "image/webp") {
    return (
      <img src={url} alt="Sticker" className="h-32 w-32 my-0.5 object-contain" />
    );
  }

  // DOCUMENTO
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-3 rounded-lg bg-black/5 dark:bg-white/5 px-3 py-2 my-1 hover:bg-black/10 dark:hover:bg-white/10 transition-colors max-w-[320px]",
      )}
      download={media?.file_name}
    >
      <div className="rounded-md bg-primary/10 p-2 shrink-0">
        <FileText className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">
          {media?.file_name || "Documento"}
        </p>
        <p className="text-xs text-muted-foreground">
          {humanSize(media?.size_bytes ?? null)} · {mime.split("/")[1] || "arquivo"}
        </p>
      </div>
      <Download className="h-4 w-4 text-muted-foreground shrink-0" />
    </a>
  );
}
