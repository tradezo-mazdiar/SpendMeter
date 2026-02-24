"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { SearchableSelect } from "@/components/spendmeter/SearchableSelect";
import { getActiveMonth } from "@/lib/actions/months";
import { listCategories } from "@/lib/actions/categories";
import { listPaymentMethods } from "@/lib/actions/payment-methods";
import { listMerchantSuggestions } from "@/lib/actions/transactions";
import { createTransaction } from "@/lib/actions/transactions";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  payment_method_id: z.string().min(1, "Select a payment method"),
  merchant: z.string().min(1, "Merchant is required"),
  category_id: z.string().min(1, "Select a category"),
  amount: z.number().positive("Amount must be positive"),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type AddExpenseModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddExpenseModal({ open, onOpenChange }: AddExpenseModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; name: string }[]>([]);
  const [merchantSuggestions, setMerchantSuggestions] = useState<string[]>([]);
  const [monthId, setMonthId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      payment_method_id: "",
      merchant: "",
      category_id: "",
      amount: 0,
      note: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      payment_method_id: "",
      merchant: "",
      category_id: "",
      amount: 0,
      note: "",
    });
    setLoading(true);
    Promise.all([
      getActiveMonth(),
      listCategories(),
      listPaymentMethods(),
      listMerchantSuggestions({ q: "", limit: 50 }),
    ]).then(([activeRes, catRes, pmRes, suggestionsRes]) => {
      if (activeRes.ok) setMonthId(activeRes.data.id);
      if (catRes.ok)
        setCategories(catRes.data.categories.map((c) => ({ id: c.id, name: c.name })));
      if (pmRes.ok)
        setPaymentMethods(
          pmRes.data.methods
            .filter((m) => m.is_active)
            .map((m) => ({ id: m.id, name: m.name }))
        );
      if (suggestionsRes.ok) setMerchantSuggestions(suggestionsRes.data.suggestions);
      setLoading(false);
    });
  }, [open, form]);

  async function onSubmit(values: FormValues) {
    if (!monthId) {
      toast({ title: "No active month", variant: "destructive" });
      return;
    }
    const result = await createTransaction({
      month_id: monthId,
      amount: values.amount,
      category_id: values.category_id,
      merchant: values.merchant.trim(),
      payment_method_id: values.payment_method_id,
      note: values.note?.trim() || null,
    });
    if (result.ok) {
      toast({ title: "Expense saved" });
      form.reset();
      onOpenChange(false);
      router.refresh();
    } else {
      toast({
        title: "Failed to save",
        description: result.error.message,
        variant: "destructive",
      });
    }
  }

  const paymentOptions = paymentMethods.map((m) => ({ value: m.id, label: m.name }));
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add expense</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="py-4 text-sm text-muted-foreground">Loading...</p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="payment_method_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment method</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          options={paymentOptions}
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
                      <FormLabel>Merchant name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Merchant name"
                          list="add-expense-merchants"
                          {...field}
                        />
                      </FormControl>
                      {merchantSuggestions.length > 0 && (
                        <datalist id="add-expense-merchants">
                          {merchantSuggestions.map((s) => (
                            <option key={s} value={s} />
                          ))}
                        </datalist>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          options={categoryOptions}
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
                          value={field.value === 0 || field.value === undefined ? "" : field.value}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? 0 : e.target.valueAsNumber)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
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
              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Saving..." : "Save"}
              </Button>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
