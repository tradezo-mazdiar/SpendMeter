"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TransactionList, type TransactionItem } from "@/components/spendmeter/TransactionList";
import { TransactionForm, type TransactionFormValues } from "@/components/spendmeter/TransactionForm";
import { getActiveMonth } from "@/lib/actions/months";
import {
  listTransactions,
  updateTransaction,
  deleteTransaction,
  listMerchantSuggestions,
} from "@/lib/actions/transactions";
import { listCategories } from "@/lib/actions/categories";
import { listPaymentMethods } from "@/lib/actions/payment-methods";
import type { TxDTO } from "@/lib/actions/types";

type DateFilter = "week" | "month" | "custom";

function getWeekRange(): { from: string; to: string } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const from = new Date(now);
  from.setDate(from.getDate() - 6);
  from.setHours(0, 0, 0, 0);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function txToItem(t: TxDTO): TransactionItem {
  return {
    id: t.id,
    amount: t.amount,
    merchant: t.merchant,
    category: t.category.name,
    paymentMethod: t.payment_method.name,
    createdAtISO: t.created_at,
    isRecurring: t.is_recurring_instance,
  };
}

export default function TransactionsPage() {
  const { toast } = useToast();
  const [monthId, setMonthId] = useState<string | null>(null);
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; name: string }[]>([]);
  const [merchantSuggestions, setMerchantSuggestions] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTx = useCallback(async () => {
    if (!monthId) return;
    let date_from: string | undefined;
    let date_to: string | undefined;
    if (dateFilter === "week") {
      const range = getWeekRange();
      date_from = range.from;
      date_to = range.to;
    } else if (dateFilter === "custom" && customFrom && customTo) {
      date_from = new Date(customFrom).toISOString();
      const toDate = new Date(customTo);
      toDate.setHours(23, 59, 59, 999);
      date_to = toDate.toISOString();
    }
    const res = await listTransactions({
      month_id: monthId,
      query: query.trim() || undefined,
      category_id: categoryFilter === "all" ? undefined : categoryFilter,
      payment_method_id: paymentFilter === "all" ? undefined : paymentFilter,
      limit: 100,
      date_from,
      date_to,
    });
    if (res.ok) setItems(res.data.transactions.map(txToItem));
  }, [monthId, query, categoryFilter, paymentFilter, dateFilter, customFrom, customTo]);

  useEffect(() => {
    async function init() {
      const [activeRes, catRes, pmRes, sugRes] = await Promise.all([
        getActiveMonth(),
        listCategories(),
        listPaymentMethods(),
        listMerchantSuggestions({ q: "", limit: 8 }),
      ]);
      if (activeRes.ok) setMonthId(activeRes.data.id);
      if (catRes.ok)
        setCategories(catRes.data.categories.map((c) => ({ id: c.id, name: c.name })));
      if (pmRes.ok)
        setPaymentMethods(
          pmRes.data.methods
            .filter((m) => m.is_active)
            .map((m) => ({ id: m.id, name: m.name }))
        );
      if (sugRes.ok) setMerchantSuggestions(sugRes.data.suggestions);
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (!monthId) return;
    loadTx();
  }, [monthId, loadTx]);

  const editingItem = editId ? items.find((i) => i.id === editId) : null;

  async function handleEdit(values: TransactionFormValues) {
    if (!editId) return;
    const result = await updateTransaction({
      id: editId,
      amount: values.amount,
      merchant: values.merchant,
      category_id: values.category_id,
      payment_method_id: values.payment_method_id,
      note: values.note ?? null,
    });
    if (result.ok) {
      setEditId(null);
      await loadTx();
      toast({ title: "Transaction updated" });
    } else {
      toast({
        title: "Failed to update",
        description: result.error.message,
        variant: "destructive",
      });
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    const result = await deleteTransaction({ id: deleteId });
    if (result.ok) {
      setItems((prev) => prev.filter((i) => i.id !== deleteId));
      setDeleteId(null);
      toast({ title: "Transaction deleted" });
    } else {
      toast({
        title: "Failed to delete",
        description: result.error.message,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">Transactions</h1>
      <Tabs value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="week">This week</TabsTrigger>
          <TabsTrigger value="month">This month</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>
        {dateFilter === "custom" && (
          <TabsContent value="custom" className="mt-2 flex flex-wrap items-center gap-3">
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => {
                const input = (e.currentTarget as HTMLDivElement).querySelector("input");
                if (input) {
                  try {
                    (input as HTMLInputElement).showPicker?.();
                  } catch {
                    input.click();
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  const input = (e.currentTarget as HTMLDivElement).querySelector("input");
                  input?.click();
                }
              }}
              className="relative flex cursor-pointer items-center"
            >
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="date-picker-brand-icon w-40 pr-9"
              />
              <CalendarIcon className="pointer-events-none absolute right-2.5 h-4 w-4 text-[#00C2A8]" aria-hidden />
            </div>
            <span className="text-sm text-muted-foreground">to</span>
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => {
                const input = (e.currentTarget as HTMLDivElement).querySelector("input");
                if (input) {
                  try {
                    (input as HTMLInputElement).showPicker?.();
                  } catch {
                    input.click();
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  const input = (e.currentTarget as HTMLDivElement).querySelector("input");
                  input?.click();
                }
              }}
              className="relative flex cursor-pointer items-center"
            >
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="date-picker-brand-icon w-40 pr-9"
              />
              <CalendarIcon className="pointer-events-none absolute right-2.5 h-4 w-4 text-[#00C2A8]" aria-hidden />
            </div>
          </TabsContent>
        )}
      </Tabs>
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search merchant or note"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All methods</SelectItem>
            {paymentMethods.map((pm) => (
              <SelectItem key={pm.id} value={pm.id}>
                {pm.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {loading ? (
        <ul className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <li key={i}>
              <Card>
                <CardContent className="flex items-center justify-between gap-2 py-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <TransactionList
          items={items}
          onEdit={(id) => setEditId(id)}
          onDelete={(id) => setDeleteId(id)}
        />
      )}

      <Dialog open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit transaction</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <TransactionForm
              key={editId}
              mode="edit"
              initial={{
                amount: editingItem.amount,
                merchant: editingItem.merchant,
                category_id: categories.find((c) => c.name === editingItem.category)?.id ?? "",
                payment_method_id: paymentMethods.find((p) => p.name === editingItem.paymentMethod)?.id ?? "",
              }}
              categories={categories}
              paymentMethods={paymentMethods}
              merchantSuggestions={merchantSuggestions}
              onSubmit={handleEdit}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete transaction?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            This will soft-delete the transaction. It will be hidden from lists and insights.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
