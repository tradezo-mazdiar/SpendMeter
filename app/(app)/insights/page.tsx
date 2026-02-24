"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getActiveMonth } from "@/lib/actions/months";
import { getInsights } from "@/lib/actions/insights";

function formatAED(n: number): string {
  return `AED ${n.toLocaleString("en-AE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-AE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function InsightsPage() {
  const [monthId, setMonthId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [byCategory, setByCategory] = useState<{ name: string; total: number }[]>([]);
  const [byMerchant, setByMerchant] = useState<{ merchant: string; total: number }[]>([]);
  const [byPaymentMethod, setByPaymentMethod] = useState<{ name: string; total: number }[]>([]);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [largestExpense, setLargestExpense] = useState<{
    merchant: string;
    amount: number;
    created_at: string;
  } | null>(null);

  const loadInsights = useCallback(async () => {
    if (!monthId) return;
    const res = await getInsights({ month_id: monthId });
    if (res.ok) {
      setByCategory(res.data.by_category);
      setByMerchant(res.data.by_merchant);
      setByPaymentMethod(res.data.by_payment_method);
      setHighlights(res.data.highlights);
      setLargestExpense(res.data.largest_expense);
      setError(null);
    } else {
      setError(res.error.message);
    }
  }, [monthId]);

  useEffect(() => {
    async function init() {
      const activeRes = await getActiveMonth();
      if (activeRes.ok) {
        setMonthId(activeRes.data.id);
      } else {
        setError(activeRes.error.message);
      }
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (!monthId) return;
    loadInsights();
  }, [monthId, loadInsights]);

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-7 w-24" />
        <Card>
          <CardHeader className="pb-1">
            <Skeleton className="h-3 w-40" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-20" />
          </CardContent>
        </Card>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-4">
        <h1 className="text-xl font-semibold">Insights</h1>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!monthId) {
    return (
      <div className="space-y-6 p-4">
        <h1 className="text-xl font-semibold">Insights</h1>
        <p className="text-sm text-muted-foreground">No active month.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-xl font-semibold">Insights</h1>

      {largestExpense && (
        <Card>
          <CardHeader className="pb-1 text-sm font-medium text-muted-foreground">
            Largest single expense
          </CardHeader>
          <CardContent>
            <p className="font-medium">{largestExpense.merchant}</p>
            <p className="text-lg font-semibold">{formatAED(largestExpense.amount)}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(largestExpense.created_at)}
            </p>
          </CardContent>
        </Card>
      )}

      {highlights.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Highlights</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {highlights.map((line, i) => (
              <Card key={i}>
                <CardContent className="py-3">
                  <p className="text-sm">{line}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {byCategory.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">By category</h2>
          <ul className="space-y-1">
            {byCategory.map(({ name, total }) => (
              <li key={name} className="flex justify-between text-sm">
                <span>{name}</span>
                <span className="tabular-nums">{formatAED(total)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {byMerchant.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">By merchant</h2>
          <ul className="space-y-1">
            {byMerchant.map(({ merchant, total }) => (
              <li key={merchant} className="flex justify-between text-sm">
                <span>{merchant}</span>
                <span className="tabular-nums">{formatAED(total)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {byPaymentMethod.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">By payment method</h2>
          <ul className="space-y-1">
            {byPaymentMethod.map(({ name, total }) => (
              <li key={name} className="flex justify-between text-sm">
                <span>{name}</span>
                <span className="tabular-nums">{formatAED(total)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!largestExpense && highlights.length === 0 && byCategory.length === 0 && byMerchant.length === 0 && byPaymentMethod.length === 0 && (
        <p className="text-sm text-muted-foreground">No transactions this month yet.</p>
      )}
    </div>
  );
}
