"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type TransactionItem = {
  id: string;
  amount: number;
  merchant: string;
  category: string;
  paymentMethod: string;
  createdAtISO: string;
  isRecurring: boolean;
};

type TransactionListProps = {
  items: TransactionItem[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
};

function formatAED(n: number): string {
  return `AED ${n.toLocaleString("en-AE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-AE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function TransactionList({
  items,
  onEdit,
  onDelete,
}: TransactionListProps) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No expenses yet this month.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.merchant}</span>
                  {item.isRecurring && (
                    <Badge variant="secondary" className="text-xs">
                      Recurring
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {item.category} · {item.paymentMethod}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(item.createdAtISO)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    item.amount > 0 && "text-destructive"
                  )}
                >
                  {formatAED(item.amount)}
                </span>
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary hover:text-primary hover:bg-primary/10"
                    onClick={() => onEdit(item.id)}
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(item.id)}
                    aria-label="Delete"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
