"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  Shield,
  Files,
  Settings,
  Database,
  Menu,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface SidebarProps {
  userName: string;
  userEmail: string;
  userImage: string;
  hasSupabase: boolean;
}

const navItems = [
  { href: "/dashboard", label: "Files", icon: Files },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function SidebarContent({ userName, userEmail, hasSupabase }: SidebarProps) {
  const pathname = usePathname();
  
  return (
    <>
      {/* Brand */}
      <div className="flex items-center gap-2 px-6 py-5">
        <Shield className="h-7 w-7 text-primary" />
        <span className="text-xl font-bold gradient-text">Docs LV</span>
      </div>

      <Separator className="opacity-30" />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Supabase status */}
      <div className="px-4 pb-2">
        <div className="rounded-lg bg-secondary/50 p-3 text-xs space-y-2">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Supabase</span>
          </div>
          {hasSupabase ? (
            <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
              Connected
            </Badge>
          ) : (
            <Link href="/dashboard/settings">
              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 cursor-pointer">
                Not Connected
              </Badge>
            </Link>
          )}
        </div>
      </div>

      <Separator className="opacity-30" />

      {/* User */}
      <div className="flex items-center gap-3 px-4 py-4 mt-auto">
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-9 w-9",
            },
          }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{userName}</p>
          <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
        </div>
      </div>
    </>
  );
}

export function Sidebar(props: SidebarProps) {
  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-border/50 bg-background">
      <SidebarContent {...props} />
    </aside>
  );
}

export function MobileSidebar(props: SidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="md:hidden flex items-center justify-between border-b border-border/50 px-4 py-3 bg-background">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <span className="text-xl font-heading font-semibold tracking-tight">Docs LV</span>
      </div>
      <div className="flex items-center gap-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="h-8 w-8 hover:bg-secondary flex items-center justify-center rounded-md">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0 flex flex-col bg-background">
            <SidebarContent {...props} />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
