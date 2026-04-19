import { useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Paperclip, Image, Film, FileText, Music, MapPin, Contact, Zap } from "lucide-react";

interface Props {
  onPickFile: (file: File, type: "image" | "video" | "audio" | "document") => void;
  onPickLocation?: () => void;
  onPickContact?: () => void;
  onPickPix?: () => void;
  onPickPoll?: () => void;
}

export function AttachmentPicker({ onPickFile, onPickLocation, onPickContact, onPickPix, onPickPoll }: Props) {
  const imgRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  const onChange = (type: "image" | "video" | "audio" | "document") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onPickFile(file, type);
      e.target.value = "";
    };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" type="button">
            <Paperclip className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-52">
          <DropdownMenuItem onClick={() => imgRef.current?.click()}>
            <Image className="h-4 w-4 mr-2 text-sky-500" /> Imagem
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => videoRef.current?.click()}>
            <Film className="h-4 w-4 mr-2 text-violet-500" /> Vídeo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => audioRef.current?.click()}>
            <Music className="h-4 w-4 mr-2 text-amber-500" /> Áudio
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => docRef.current?.click()}>
            <FileText className="h-4 w-4 mr-2 text-emerald-500" /> Documento
          </DropdownMenuItem>
          {onPickLocation && (
            <DropdownMenuItem onClick={onPickLocation}>
              <MapPin className="h-4 w-4 mr-2 text-rose-500" /> Localização
            </DropdownMenuItem>
          )}
          {onPickContact && (
            <DropdownMenuItem onClick={onPickContact}>
              <Contact className="h-4 w-4 mr-2 text-cyan-500" /> Contato
            </DropdownMenuItem>
          )}
          {onPickPix && (
            <DropdownMenuItem onClick={onPickPix}>
              <Zap className="h-4 w-4 mr-2 text-green-600" /> PIX
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={onChange("image")} />
      <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={onChange("video")} />
      <input ref={audioRef} type="file" accept="audio/*" className="hidden" onChange={onChange("audio")} />
      <input ref={docRef} type="file" className="hidden" onChange={onChange("document")} />
    </>
  );
}
