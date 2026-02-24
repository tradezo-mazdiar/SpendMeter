"use client";

import { useEffect, useState } from "react";
import { SpendBar } from "@/components/spendmeter/SpendBar";
import { MonthSelector } from "@/components/spendmeter/MonthSelector";
import { QuickInsightCards } from "@/components/spendmeter/QuickInsightCards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getActiveMonth,
  listMonths,
  detectNewMonthNeeded,
  startNewMonth,
  updateActiveMonthLimit,
  getMonthSpent,
} from "@/lib/actions/months";
import { getMonthOverview } from "@/lib/actions/insights";
import { getSessionProfile } from "@/lib/actions/profile";
import { listPaymentMethodsWithSpent } from "@/lib/actions/payment-methods";
import type { MonthDTO } from "@/lib/actions/types";
import type { PaymentMethodWithSpentDTO } from "@/lib/actions/payment-methods";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { listTransactions } from "@/lib/actions/transactions";
import type { TxDTO } from "@/lib/actions/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function HomePage() {
  const { toast } = useToast();
  const [activeMonth, setActiveMonth] = useState<MonthDTO | null>(null);
  const [months, setMonths] = useState<MonthDTO[]>([]);
  const [spent, setSpent] = useState(0);
  const [newMonthNeeded, setNewMonthNeeded] = useState<{
    needed: boolean;
    suggested_label: string;
    current_active_label: string;
  } | null>(null);
  const [selectedMonthId, setSelectedMonthId] = useState<string>("");
  const [editingLimit, setEditingLimit] = useState(false);
  const [limitInput, setLimitInput] = useState("");
  const [startingMonth, setStartingMonth] = useState(false);
  const [savingLimit, setSavingLimit] = useState(false);
  const [overview, setOverview] = useState<{
    top_category: { name: string; total: number } | null;
    top_merchant: { merchant: string; total: number } | null;
    recurring_total: number;
    transaction_count: number;
  } | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [cardMethods, setCardMethods] = useState<PaymentMethodWithSpentDTO[]>([]);
  const [lastTransactions, setLastTransactions] = useState<TxDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardModalMethod, setCardModalMethod] =
    useState<PaymentMethodWithSpentDTO | null>(null);
  const [cardModalTx, setCardModalTx] = useState<TxDTO[]>([]);
  const [cardModalLoading, setCardModalLoading] = useState(false);

  async function load() {
    setLoading(true);
    const [activeRes, listRes, detectRes, profileRes] = await Promise.all([
      getActiveMonth(),
      listMonths({ limit: 24 }),
      detectNewMonthNeeded(),
      getSessionProfile(),
    ]);

    if (activeRes.ok) {
      setActiveMonth(activeRes.data);
      setSelectedMonthId(activeRes.data.id);
      setLimitInput(String(activeRes.data.spending_limit));
      const [spentRes, overviewRes, cardsRes] = await Promise.all([
        getMonthSpent(activeRes.data.id),
        getMonthOverview({ month_id: activeRes.data.id }),
        listPaymentMethodsWithSpent(activeRes.data.id),
      ]);
      if (spentRes.ok) setSpent(spentRes.data.spent);
      if (overviewRes.ok) {
        setOverview({
          top_category: overviewRes.data.top_category,
          top_merchant: overviewRes.data.top_merchant,
          recurring_total: overviewRes.data.recurring_total,
          transaction_count: overviewRes.data.transaction_count,
        });
      } else {
        setOverview(null);
      }
      if (cardsRes.ok) setCardMethods(cardsRes.data.methods);
      else setCardMethods([]);
      const txRes = await listTransactions({
        month_id: activeRes.data.id,
        limit: 5,
      });
      if (txRes.ok) setLastTransactions(txRes.data.transactions);
      else setLastTransactions([]);
    }
    if (listRes.ok) setMonths(listRes.data.months);
    if (detectRes.ok) setNewMonthNeeded(detectRes.data);
    if (profileRes.ok) setDisplayName(profileRes.data.display_name ?? "");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!cardModalMethod || !selectedMonthId) {
      setCardModalTx([]);
      return;
    }
    setCardModalLoading(true);
    listTransactions({
      month_id: selectedMonthId,
      payment_method_id: cardModalMethod.id,
      limit: 10,
    })
      .then((res) => {
        if (res.ok) setCardModalTx(res.data.transactions);
        else setCardModalTx([]);
      })
      .finally(() => setCardModalLoading(false));
  }, [cardModalMethod?.id, selectedMonthId]);

  async function handleStartNewMonth() {
    if (!newMonthNeeded?.needed || !activeMonth) return;
    setStartingMonth(true);
    const result = await startNewMonth({
      label: newMonthNeeded.suggested_label,
      spending_limit: activeMonth.spending_limit,
    });
    setStartingMonth(false);
    if (result.ok) {
      setActiveMonth(result.data.new_month);
      setSelectedMonthId(result.data.new_month.id);
      setSpent(0);
      setLimitInput(String(result.data.new_month.spending_limit));
      setNewMonthNeeded({
        needed: false,
        suggested_label: newMonthNeeded.suggested_label,
        current_active_label: result.data.new_month.label,
      });
      setOverview(null);
      const [listRes, overviewRes] = await Promise.all([
        listMonths({ limit: 24 }),
        getMonthOverview({ month_id: result.data.new_month.id }),
      ]);
      if (listRes.ok) setMonths(listRes.data.months);
      if (overviewRes.ok) {
        setOverview({
          top_category: overviewRes.data.top_category,
          top_merchant: overviewRes.data.top_merchant,
          recurring_total: overviewRes.data.recurring_total,
          transaction_count: overviewRes.data.transaction_count,
        });
      }
      toast({ title: "New month started" });
    } else {
      toast({
        title: "Failed to start month",
        description: result.error.message,
        variant: "destructive",
      });
    }
  }

  async function handleSaveLimit() {
    if (!activeMonth) return;
    const value = Number(limitInput);
    if (!Number.isFinite(value) || value < 0) {
      toast({
        title: "Invalid limit",
        variant: "destructive",
      });
      return;
    }
    setSavingLimit(true);
    const result = await updateActiveMonthLimit({ spending_limit: value });
    setSavingLimit(false);
    if (result.ok) {
      setActiveMonth((m) => (m ? { ...m, spending_limit: value } : null));
      setEditingLimit(false);
      toast({ title: "Limit updated" });
    } else {
      toast({
        title: "Failed to update limit",
        description: result.error.message,
        variant: "destructive",
      });
    }
  }

  const [viewSpent, setViewSpent] = useState<Record<string, number>>({});
  const [viewCardMethods, setViewCardMethods] = useState<PaymentMethodWithSpentDTO[]>([]);

  useEffect(() => {
    if (!selectedMonthId) return;
    if (selectedMonthId === activeMonth?.id) {
      setViewSpent((prev) => ({ ...prev, [selectedMonthId]: spent }));
      setViewCardMethods(cardMethods);
      return;
    }
    getMonthSpent(selectedMonthId).then((res) => {
      if (res.ok) setViewSpent((prev) => ({ ...prev, [selectedMonthId]: res.data.spent }));
    });
    listPaymentMethodsWithSpent(selectedMonthId).then((res) => {
      if (res.ok) setViewCardMethods(res.data.methods);
      else setViewCardMethods([]);
    });
  }, [selectedMonthId, activeMonth?.id, spent, cardMethods]);

  const monthOptions = months.map((m) => ({
    id: m.id,
    label: m.label,
    is_active: m.id === activeMonth?.id,
  }));
  const selectedMonth = months.find((m) => m.id === selectedMonthId);
  const displayLimit = selectedMonth?.spending_limit ?? 0;
  const displaySpent = viewSpent[selectedMonthId] ?? 0;

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-full rounded-full" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-1">
                <Skeleton className="h-3 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-5 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Home</h1>
        <MonthSelector
          months={monthOptions}
          value={selectedMonthId}
          onChange={setSelectedMonthId}
        />
      </div>

      {newMonthNeeded?.needed && (
        <div className="rounded-xl border border-amber/50 bg-amber/10 p-4">
          <p className="font-medium text-foreground">
            New month detected — Start {newMonthNeeded.suggested_label}?
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Current: {newMonthNeeded.current_active_label}
          </p>
          <Button
            className="mt-3"
            onClick={handleStartNewMonth}
            disabled={startingMonth}
          >
            {startingMonth ? "Starting..." : `Start ${newMonthNeeded.suggested_label}`}
          </Button>
        </div>
      )}

      {/* Spending limit card (credit-card style with user name) */}
      <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-card to-muted/30">
        <CardContent className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Monthly spending limit
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {displayName || "SpendMeter"}
          </p>
          <div className="mt-3 flex items-center justify-between gap-2">
            {selectedMonthId === activeMonth?.id && editingLimit ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  step={100}
                  className="w-28"
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                />
                <Button size="sm" onClick={handleSaveLimit} disabled={savingLimit}>
                  {savingLimit ? "Saving..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingLimit(false);
                    setLimitInput(String(activeMonth?.spending_limit ?? 0));
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground">
                  Limit: AED {displayLimit.toLocaleString()}
                </span>
                {selectedMonthId === activeMonth?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                    onClick={() => setEditingLimit(true)}
                    aria-label="Edit limit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="mt-3">
            <SpendBar limit={displayLimit} spent={displaySpent} />
          </div>
        </CardContent>
      </Card>

      {/* Credit/Debit cards - same style as monthly limit card, with SpendBar */}
      {viewCardMethods.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Your cards
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {viewCardMethods.map((m) => {
              const limit = m.card_limit ?? 0;
              const hasLimit = m.card_limit != null && m.card_limit > 0;
              return (
                <Card
                  key={m.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setCardModalMethod(m)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setCardModalMethod(m);
                    }
                  }}
                  className={cn(
                    "cursor-pointer overflow-hidden border-2 bg-gradient-to-br from-card to-muted/30 transition-colors hover:bg-muted/30",
                    hasLimit && m.remaining != null && m.remaining < 0
                      ? "border-destructive/30"
                      : "border-primary/20"
                  )}
                >
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {m.type}
                    </p>
                    <p className="mt-1 truncate text-lg font-semibold text-foreground">
                      {m.name}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">
                        Limit: AED {limit.toLocaleString()}
                      </span>
                    </div>
                    {hasLimit ? (
                      <div className="mt-3">
                        <SpendBar limit={limit} spent={m.spent} />
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Spent: AED {m.spent.toLocaleString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={!!cardModalMethod} onOpenChange={(open) => !open && setCardModalMethod(null)}>
        <DialogContent className="max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {cardModalMethod?.name} — This month
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {cardModalLoading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : cardModalTx.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions this month.</p>
            ) : (
              <ul className="space-y-2">
                {cardModalTx.map((t) => (
                  <li key={t.id}>
                    <Card>
                      <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{t.merchant}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.category.name}
                          </p>
                        </div>
                        <span className="font-semibold tabular-nums text-foreground">
                          AED {Number(t.amount).toLocaleString()}
                        </span>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t pt-3">
            <Link
              href="/transactions"
              className="text-sm font-medium text-primary hover:underline"
              onClick={() => setCardModalMethod(null)}
            >
              View all →
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      <QuickInsightCards
        topCategory={overview?.top_category ?? null}
        topMerchant={overview?.top_merchant ?? null}
        recurringTotal={overview?.recurring_total ?? 0}
        txCount={overview?.transaction_count ?? 0}
      />

      {/* Last 5 transactions */}
      {lastTransactions.length > 0 && selectedMonthId === activeMonth?.id && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              Recent transactions
            </h2>
            <Link
              href="/transactions"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="space-y-2">
            {lastTransactions.map((t) => (
              <li key={t.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{t.merchant}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.category.name} · {t.payment_method.name}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums text-foreground">
                      AED {Number(t.amount).toLocaleString()}
                    </span>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
