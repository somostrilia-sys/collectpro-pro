import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";

const EMOJI_SETS: { label: string; emojis: string[] }[] = [
  {
    label: "Frequentes",
    emojis: ["👍", "❤️", "😂", "😮", "😢", "🙏", "😊", "🔥", "🎉", "✅"],
  },
  {
    label: "Rostos",
    emojis: ["😀", "😃", "😄", "😁", "😆", "🥰", "😘", "😋", "🤔", "🤨", "😐", "😑", "😏", "😒", "🙄", "😬"],
  },
  {
    label: "Gestos",
    emojis: ["👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️"],
  },
  {
    label: "Objetos",
    emojis: ["💰", "💵", "💸", "💳", "🧾", "📱", "💻", "⌨️", "🖥️", "🖨️", "📷", "📞", "☎️", "📧", "✉️", "📨"],
  },
  {
    label: "Símbolos",
    emojis: ["✅", "❌", "⚠️", "🚫", "💯", "✨", "🎉", "🎊", "🔔", "📌", "📍", "🔗", "⭐", "🌟", "⚡", "🔥"],
  },
];

interface Props {
  onPick: (emoji: string) => void;
  trigger?: React.ReactNode;
}

export function EmojiPicker({ onPick, trigger }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" className="h-9 w-9" type="button">
            <Smile className="h-5 w-5" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="end">
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {EMOJI_SETS.map((set) => (
            <div key={set.label}>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {set.label}
              </p>
              <div className="grid grid-cols-8 gap-1">
                {set.emojis.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      onPick(e);
                      setOpen(false);
                    }}
                    className="h-8 w-8 flex items-center justify-center text-lg hover:bg-muted rounded transition-colors"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
