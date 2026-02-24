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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const transactionSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  category_id: z.string().min(1, "Select a category"),
  payment_method_id: z.string().min(1, "Select a payment method"),
  merchant: z.string().min(1, "Merchant is required"),
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
  merchantSuggestions?: string[];
  onSubmit: (values: TransactionFormValues) => Promise<void>;
};

export function TransactionForm({
  mode,
  initial,
  categories,
  paymentMethods,
  merchantSuggestions = [],
  onSubmit,
}: TransactionFormProps) {
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: initial?.amount ?? 0,
      category_id: initial?.category_id ?? "",
      payment_method_id: initial?.payment_method_id ?? "",
      merchant: initial?.merchant ?? "",
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
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {paymentMethods.map((pm) => (
                    <SelectItem key={pm.id} value={pm.id}>
                      {pm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <Input
                  list="merchant-suggestions"
                  placeholder="Merchant name"
                  {...field}
                />
              </FormControl>
              {merchantSuggestions.length > 0 && (
                <datalist id="merchant-suggestions">
                  {merchantSuggestions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              )}
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
