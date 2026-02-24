"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { AppSidebar } from "@/components/spendmeter/AppSidebar";
import { AddExpenseModal } from "@/components/spendmeter/AddExpenseModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
// Use project’s transparent logo so no background is introduced
import logoSrc from "../../SpendMeter_Logo_Transparent_Final.png";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [addOpen, setAddOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed top bar: hamburger left, logo right */}
      <header className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background px-4">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow hover:bg-muted"
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <Link
          href="/home"
          className="flex h-10 items-center justify-end bg-transparent"
          aria-label="SpendMeter home"
        >
          <img
            src={logoSrc.src}
            alt="SpendMeter"
            className="h-10 w-auto max-w-[12rem] object-contain object-right md:max-w-[14rem]"
            style={{ background: "transparent" }}
          />
        </Link>
      </header>

      <AppSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      <div className="min-h-screen">
        <main className="min-h-screen pb-20 pt-14 md:pb-8">{children}</main>
        <div className="fixed bottom-6 right-6 z-30">
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg"
            onClick={() => setAddOpen(true)}
            aria-label="Add expense"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>
      <AddExpenseModal open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
