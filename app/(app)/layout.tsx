import { AppShell } from "@/components/spendmeter/AppShell";
import { ensureUserSeedData } from "@/lib/actions/seed";
import { getActiveMonth } from "@/lib/actions/months";
import { ensureRecurringAppliedForMonth } from "@/lib/actions/recurring";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureUserSeedData();

  const activeMonthResult = await getActiveMonth();
  if (activeMonthResult.ok) {
    await ensureRecurringAppliedForMonth({ month_id: activeMonthResult.data.id });
  }

  return <AppShell>{children}</AppShell>;
}
