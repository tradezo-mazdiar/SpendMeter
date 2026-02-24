import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type QuickInsightCardsProps = {
  topCategory?: { name: string; total: number } | null;
  topMerchant?: { merchant: string; total: number } | null;
  recurringTotal: number;
  txCount: number;
};

function formatAED(n: number): string {
  return `AED ${n.toLocaleString("en-AE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function QuickInsightCards({
  topCategory,
  topMerchant,
  recurringTotal,
  txCount,
}: QuickInsightCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="transition-colors hover:bg-muted/50">
        <Link href="/recurring">
          <CardHeader className="pb-1 text-xs font-medium text-muted-foreground">
            Recurring this month
          </CardHeader>
          <CardContent>
            <p className="font-medium">{formatAED(recurringTotal)}</p>
          </CardContent>
        </Link>
      </Card>
      <Card className="transition-colors hover:bg-muted/50">
        <Link href="/transactions">
          <CardHeader className="pb-1 text-xs font-medium text-muted-foreground">
            Transactions
          </CardHeader>
          <CardContent>
            <p className="font-medium">{txCount}</p>
          </CardContent>
        </Link>
      </Card>
      {topCategory && (
        <Card>
          <CardHeader className="pb-1 text-xs font-medium text-muted-foreground">
            Top category
          </CardHeader>
          <CardContent>
            <p className="font-medium">{topCategory.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatAED(topCategory.total)}
            </p>
          </CardContent>
        </Card>
      )}
      {topMerchant && (
        <Card>
          <CardHeader className="pb-1 text-xs font-medium text-muted-foreground">
            Top merchant
          </CardHeader>
          <CardContent>
            <p className="font-medium">{topMerchant.merchant}</p>
            <p className="text-sm text-muted-foreground">
              {formatAED(topMerchant.total)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
