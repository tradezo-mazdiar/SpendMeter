"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { MerchantPicker } from "@/components/spendmeter/MerchantPicker";
import { SearchableSelect } from "@/components/spendmeter/SearchableSelect";
import { CalendarIcon } from "lucide-react";

const transactionSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  category_id: z.string().min(1, "Select a category"),
  payment_method_id: z.string().min(1, "Select a payment method"),
  merchant: z.string().min(1, "Merchant is required"),
  spent_on: z.string().optional(),
  note: z.string().optional(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;

export type TransactionFormInitial = Partial<TransactionFormValues> & {
  id?: string;
};

type TransactionFormProps = {
  mode: "create" | "edit";
  initial?: TransactionFormInitial;
  categories: { id: string; name: string }[];
  paymentMethods: { id: string; name: string }[];
  onSubmit: (values: TransactionFormValues) => Promise<void>;
};

export function TransactionForm({
  mode,
  initial,
  categories,
  paymentMethods,
  onSubmit,
}: TransactionFormProps) {
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: initial?.amount ?? 0,
      category_id: initial?.category_id ?? "",
      payment_method_id: initial?.payment_method_id ?? "",
      merchant: initial?.merchant ?? "",
      spent_on: initial?.spent_on ?? "",
      note: initial?.note ?? "",
    },
  });

  async function handleSubmit(values: TransactionFormValues) {
    await onSubmit(values);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
      >
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (AED)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0"
                  className="text-lg"
                  {...field}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <SearchableSelect
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Select category"
                  aria-label="Category"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="payment_method_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment method</FormLabel>
              <FormControl>
                <SearchableSelect
                  options={paymentMethods.map((pm) => ({ value: pm.id, label: pm.name }))}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Select payment method"
                  aria-label="Payment method"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="merchant"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Merchant</FormLabel>
              <FormControl>
                <MerchantPicker
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Merchant name"
                  aria-label="Merchant"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="spent_on"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
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
                      (e.currentTarget as HTMLDivElement).querySelector("input")?.click();
                    }
                  }}
                  className="relative flex cursor-pointer items-center"
                >
                  <Input
                    type="date"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="date-picker-brand-icon pr-9"
                  />
                  <CalendarIcon
                    className="pointer-events-none absolute right-2.5 h-4 w-4 text-[#00C2A8]"
                    aria-hidden
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Optional note"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : mode === "create" ? "Save" : "Update"}
        </Button>
      </form>
    </Form>
  );
}
