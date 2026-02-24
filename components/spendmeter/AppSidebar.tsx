"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Receipt,
  Repeat,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSessionProfile } from "@/lib/actions/profile";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

type AppSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AppSidebar({ open, onOpenChange }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    onOpenChange(false);
  }, [pathname, onOpenChange]);

  useEffect(() => {
    if (open) {
      getSessionProfile().then((res) => {
        if (res.ok) setDisplayName(res.data.display_name ?? "");
      });
    }
  }, [open]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    onOpenChange(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            aria-hidden
            onClick={() => onOpenChange(false)}
          />
          <aside className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col border-r border-border bg-card shadow-xl pt-14">
            <div className="flex h-14 shrink-0 items-center border-b border-border px-3">
              <span className="truncate text-sm font-semibold text-foreground">
                Hi {displayName ? `${displayName}!` : "!"}
              </span>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    pathname === href
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              ))}
            </nav>
            <div className="border-t border-border p-2">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                Log out
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
