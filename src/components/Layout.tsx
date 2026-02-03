import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Menu, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TermsModal, PrivacyModal } from "@/components/LegalModals";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
      {children}
    </div>
  );
}
