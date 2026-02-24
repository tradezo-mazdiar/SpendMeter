"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, Repeat, BarChart3, Settings, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/transactions", label: "Transactions", icon: List },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background">
      <div className="flex h-14 items-center justify-around">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-4 py-2 text-xs transition-colors duration-150",
              pathname === href
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function FloatingAddButton() {
  return (
    <div className="fixed bottom-20 right-4 z-40">
      <Button asChild size="icon" className="h-12 w-12 rounded-full shadow">
        <Link href="/add">
          <Plus className="h-6 w-6" />
          <span className="sr-only">Add expense</span>
        </Link>
      </Button>
    </div>
  );
}
