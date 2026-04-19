import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreVertical, Reply, Smile, Forward, Pin, Copy, Pencil, Trash2,
} from "lucide-react";
import type { WhatsAppMessage } from "@/types/whatsapp";

interface Props {
  message: WhatsAppMessage;
  onReply?: (msg: WhatsAppMessage) => void;
  onReact?: (msg: WhatsAppMessage) => void;
  onForward?: (msg: WhatsAppMessage) => void;
  onPin?: (msg: WhatsAppMessage) => void;
  onCopy?: (msg: WhatsAppMessage) => void;
  onEdit?: (msg: WhatsAppMessage) => void;
  onDelete?: (msg: WhatsAppMessage) => void;
}

export function MessageActionsMenu({
  message, onReply, onReact, onForward, onPin, onCopy, onEdit, onDelete,
}: Props) {
  const mine = message.direction === "out";
  const canEdit = mine && message.provider_tipo === "uazapi" && !!message.body;
  const canDelete = mine;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          type="button"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {onReply && (
          <DropdownMenuItem onClick={() => onReply(message)}>
            <Reply className="h-4 w-4 mr-2" /> Responder
          </DropdownMenuItem>
        )}
        {onReact && (
          <DropdownMenuItem onClick={() => onReact(message)}>
            <Smile className="h-4 w-4 mr-2" /> Reagir
          </DropdownMenuItem>
        )}
        {onForward && (
          <DropdownMenuItem onClick={() => onForward(message)}>
            <Forward className="h-4 w-4 mr-2" /> Encaminhar
          </DropdownMenuItem>
        )}
        {onPin && (
          <DropdownMenuItem onClick={() => onPin(message)}>
            <Pin className="h-4 w-4 mr-2" /> Fixar
          </DropdownMenuItem>
        )}
        {onCopy && message.body && (
          <DropdownMenuItem onClick={() => onCopy(message)}>
            <Copy className="h-4 w-4 mr-2" /> Copiar
          </DropdownMenuItem>
        )}
        {(canEdit || canDelete) && <DropdownMenuSeparator />}
        {canEdit && onEdit && (
          <DropdownMenuItem onClick={() => onEdit(message)}>
            <Pencil className="h-4 w-4 mr-2" /> Editar
          </DropdownMenuItem>
        )}
        {canDelete && onDelete && (
          <DropdownMenuItem onClick={() => onDelete(message)} className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" /> Apagar pra todos
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
