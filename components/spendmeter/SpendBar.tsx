import { cn } from "@/lib/utils";

type SpendBarProps = {
  limit: number;
  spent: number;
};

function formatAED(n: number): string {
  return `AED ${n.toLocaleString("en-AE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function SpendBar({ limit, spent }: SpendBarProps) {
  const remaining = limit - spent;
  const isOver = limit > 0 && spent > limit;
  const fillRatio = limit > 0 ? Math.min(1, spent / limit) : 0;
  const remainingIsNegative = remaining < 0;

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "h-3 w-full overflow-hidden rounded-full bg-muted",
          isOver && "bg-destructive/20"
        )}
        role="progressbar"
        aria-valuenow={spent}
        aria-valuemin={0}
        aria-valuemax={limit}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-150 ease-out",
            isOver ? "bg-destructive" : "bg-primary"
          )}
          style={{ width: `${fillRatio * 100}%` }}
        />
      </div>
      <div className="flex justify-between gap-4 text-sm">
        <div>
          <p className="text-sm text-muted-foreground">Spent:</p>
          <p className="mt-1 font-semibold tabular-nums text-destructive">
            {formatAED(spent)}
          </p>
        </div>
        <div>
          <p className="text-sm font-normal text-muted-foreground">Remaining:</p>
          <p
            className={cn(
              "mt-1 font-semibold tabular-nums",
              remainingIsNegative ? "text-destructive" : "text-primary"
            )}
          >
            {formatAED(remaining)}
          </p>
        </div>
      </div>
    </div>
  );
}
