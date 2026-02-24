/**
 * Single source of mock data for Phase 1 UI.
 * No Supabase or API calls.
 */

export const MOCK_MONTH_ID = "mock-month-feb-2026";

export const mockMonths = [
  { id: MOCK_MONTH_ID, label: "Feb 2026", is_active: true },
  { id: "mock-month-jan-2026", label: "Jan 2026", is_active: false },
  { id: "mock-month-dec-2025", label: "Dec 2025", is_active: false },
];

export const mockCategories = [
  { id: "cat-food", name: "Food" },
  { id: "cat-fuel", name: "Fuel" },
  { id: "cat-groceries", name: "Groceries" },
  { id: "cat-bills", name: "Bills" },
  { id: "cat-shopping", name: "Shopping" },
  { id: "cat-entertainment", name: "Entertainment" },
  { id: "cat-other", name: "Other" },
];

export const mockPaymentMethods = [
  { id: "pm-cash", name: "Cash" },
  { id: "pm-debit", name: "Debit Card" },
  { id: "pm-credit", name: "Credit Card" },
];

export type MockTransactionItem = {
  id: string;
  amount: number;
  merchant: string;
  category: string;
  categoryId: string;
  paymentMethod: string;
  paymentMethodId: string;
  createdAtISO: string;
  isRecurring: boolean;
  note?: string | null;
};

export const mockTransactions: MockTransactionItem[] = [
  {
    id: "tx-1",
    amount: 85,
    merchant: "Carrefour",
    category: "Groceries",
    categoryId: "cat-groceries",
    paymentMethod: "Debit Card",
    paymentMethodId: "pm-debit",
    createdAtISO: "2026-02-20T10:00:00Z",
    isRecurring: false,
  },
  {
    id: "tx-2",
    amount: 120,
    merchant: "Enoc",
    category: "Fuel",
    categoryId: "cat-fuel",
    paymentMethod: "Credit Card",
    paymentMethodId: "pm-credit",
    createdAtISO: "2026-02-18T14:30:00Z",
    isRecurring: false,
  },
  {
    id: "tx-3",
    amount: 2500,
    merchant: "Landlord",
    category: "Bills",
    categoryId: "cat-bills",
    paymentMethod: "Debit Card",
    paymentMethodId: "pm-debit",
    createdAtISO: "2026-02-01T09:00:00Z",
    isRecurring: true,
  },
  {
    id: "tx-4",
    amount: 45,
    merchant: "Starbucks",
    category: "Food",
    categoryId: "cat-food",
    paymentMethod: "Cash",
    paymentMethodId: "pm-cash",
    createdAtISO: "2026-02-22T08:00:00Z",
    isRecurring: false,
  },
  {
    id: "tx-5",
    amount: 180,
    merchant: "Amazon",
    category: "Shopping",
    categoryId: "cat-shopping",
    paymentMethod: "Credit Card",
    paymentMethodId: "pm-credit",
    createdAtISO: "2026-02-15T16:00:00Z",
    isRecurring: false,
  },
  {
    id: "tx-6",
    amount: 350,
    merchant: "DEWA",
    category: "Bills",
    categoryId: "cat-bills",
    paymentMethod: "Debit Card",
    paymentMethodId: "pm-debit",
    createdAtISO: "2026-02-05T12:00:00Z",
    isRecurring: true,
  },
];

export type MockRecurringItem = {
  id: string;
  name: string;
  amount: number;
  due_day: number;
  merchant: string;
  categoryId: string;
  categoryName: string;
  paymentMethodId: string;
  paymentMethodName: string;
  is_active: boolean;
};

export const mockRecurringTemplates: MockRecurringItem[] = [
  {
    id: "rec-1",
    name: "Rent",
    amount: 2500,
    due_day: 1,
    merchant: "Landlord",
    categoryId: "cat-bills",
    categoryName: "Bills",
    paymentMethodId: "pm-debit",
    paymentMethodName: "Debit Card",
    is_active: true,
  },
  {
    id: "rec-2",
    name: "DEWA",
    amount: 350,
    due_day: 5,
    merchant: "DEWA",
    categoryId: "cat-bills",
    categoryName: "Bills",
    paymentMethodId: "pm-debit",
    paymentMethodName: "Debit Card",
    is_active: true,
  },
  {
    id: "rec-3",
    name: "Netflix",
    amount: 55,
    due_day: 15,
    merchant: "Netflix",
    categoryId: "cat-entertainment",
    categoryName: "Entertainment",
    paymentMethodId: "pm-credit",
    paymentMethodName: "Credit Card",
    is_active: true,
  },
];

export const mockSpendingLimit = 5000;

export const mockSpentTotal = mockTransactions.reduce((sum, t) => sum + t.amount, 0);

function byCategory() {
  const map = new Map<string, number>();
  for (const t of mockTransactions) {
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return Array.from(map.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

function byMerchant() {
  const map = new Map<string, number>();
  for (const t of mockTransactions) {
    map.set(t.merchant, (map.get(t.merchant) ?? 0) + t.amount);
  }
  return Array.from(map.entries())
    .map(([merchant, total]) => ({ merchant, total }))
    .sort((a, b) => b.total - a.total);
}

function byPaymentMethod() {
  const map = new Map<string, number>();
  for (const t of mockTransactions) {
    map.set(t.paymentMethod, (map.get(t.paymentMethod) ?? 0) + t.amount);
  }
  return Array.from(map.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

export const mockByCategory = byCategory();
export const mockByMerchant = byMerchant();
export const mockByPaymentMethod = byPaymentMethod();

export const mockTopCategory = mockByCategory[0] ?? null;
export const mockTopMerchant = mockByMerchant[0] ?? null;

export const mockRecurringTotal = mockTransactions
  .filter((t) => t.isRecurring)
  .reduce((sum, t) => sum + t.amount, 0);

export const mockLargestExpense = mockTransactions.length
  ? (() => {
      const t = [...mockTransactions].sort((a, b) => b.amount - a.amount)[0];
      return {
        merchant: t.merchant,
        amount: t.amount,
        created_at: t.createdAtISO,
      };
    })()
  : null;

export function getMockHighlights(): string[] {
  const lines: string[] = [];
  if (mockTopCategory) {
    lines.push(`Top category: ${mockTopCategory.name} — AED ${mockTopCategory.total.toLocaleString()}`);
  }
  if (mockTopMerchant) {
    lines.push(`Top merchant: ${mockTopMerchant.merchant} — AED ${mockTopMerchant.total.toLocaleString()}`);
  }
  if (mockLargestExpense) {
    lines.push(`Largest expense: ${mockLargestExpense.merchant} — AED ${mockLargestExpense.amount.toLocaleString()}`);
  }
  lines.push(`Recurring this month: AED ${mockRecurringTotal.toLocaleString()}`);
  lines.push(`Transaction count: ${mockTransactions.length}`);
  return lines;
}

export const mockMerchantSuggestions = Array.from(
  new Set(mockTransactions.map((t) => t.merchant))
).slice(0, 8);
