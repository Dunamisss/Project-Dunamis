import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Facebook, Link2, Mail, MessageCircle, Twitter, ChevronDown } from "lucide-react";

interface ShareMenuProps {
  title: string;
  url: string;
  onCopy?: (message: string) => void;
}

const openShare = (shareUrl: string) => {
  window.open(shareUrl, "_blank", "noopener,noreferrer");
};

export default function ShareMenu({ title, url, onCopy }: ShareMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      onCopy?.("Link copied to clipboard.");
    } catch {
      onCopy?.("Copy failed. Please select and copy manually.");
    } finally {
      setIsOpen(false);
    }
  };

  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
          Share
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={12}
        className="bg-black/90 text-white border-yellow-500/30 z-50 w-56"
      >
        <DropdownMenuItem
          className="cursor-pointer focus:bg-yellow-500/20"
          onClick={() => openShare(`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`)}
        >
          <Twitter className="mr-2 h-4 w-4" />
          Share on X
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer focus:bg-yellow-500/20"
          onClick={() => openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)}
        >
          <Facebook className="mr-2 h-4 w-4" />
          Share on Facebook
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer focus:bg-yellow-500/20"
          onClick={() => openShare(`https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`)}
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Share on WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer focus:bg-yellow-500/20"
          onClick={() => openShare(`mailto:?subject=${encodedTitle}&body=${encodedUrl}`)}
        >
          <Mail className="mr-2 h-4 w-4" />
          Share via Email
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer focus:bg-yellow-500/20" onClick={handleCopy}>
          <Link2 className="mr-2 h-4 w-4" />
          Copy Link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
