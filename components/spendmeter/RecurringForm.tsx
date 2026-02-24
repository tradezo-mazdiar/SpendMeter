"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CalendarIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const recurringSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.number().positive("Amount must be positive"),
  due_day: z.number().min(1).max(31),
  category_id: z.string().min(1, "Select a category"),
  payment_method_id: z.string().min(1, "Select a payment method"),
  merchant: z.string().min(1, "Merchant is required"),
});

export type RecurringFormValues = z.infer<typeof recurringSchema>;

export type RecurringFormInitial = Partial<RecurringFormValues> & {
  id?: string;
};

type RecurringFormProps = {
  mode: "create" | "edit";
  initial?: RecurringFormInitial;
  categories: { id: string; name: string }[];
  paymentMethods: { id: string; name: string }[];
  onSubmit: (values: RecurringFormValues) => Promise<void>;
};

export function RecurringForm({
  mode,
  initial,
  categories,
  paymentMethods,
  onSubmit,
}: RecurringFormProps) {
  const form = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      name: initial?.name ?? "",
      amount: initial?.amount != null ? Number(initial.amount) : 0,
      due_day: initial?.due_day != null ? Number(initial.due_day) : mode === "create" ? 0 : 1,
      category_id: initial?.category_id ?? "",
      payment_method_id: initial?.payment_method_id ?? "",
      merchant: initial?.merchant ?? "",
    },
  });

  async function handleSubmit(values: RecurringFormValues) {
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Rent" {...field} />
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
                  value={field.value === 0 ? "" : field.value}
                  onChange={(e) =>
                    field.onChange(e.target.value === "" ? 0 : e.target.valueAsNumber)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="due_day"
          render={({ field }) => {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            const maxDay = new Date(year, month + 1, 0).getDate();
            const dayVal = Number(field.value);
            const hasDay = dayVal >= 1 && dayVal <= 31;
            const day = hasDay ? Math.min(maxDay, Math.max(1, dayVal)) : 1;
            const monthStr = String(month + 1).padStart(2, "0");
            const dayStr = String(day).padStart(2, "0");
            const dateValue = mode === "create" && !hasDay ? "" : `${year}-${monthStr}-${dayStr}`;
            return (
              <FormItem>
                <FormLabel>Due date</FormLabel>
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
                      value={dateValue}
                      min={`${year}-${monthStr}-01`}
                      max={`${year}-${monthStr}-${String(maxDay).padStart(2, "0")}`}
                      onChange={(e) => {
                        const d = e.target.valueAsDate;
                        if (d) field.onChange(d.getDate());
                      }}
                      className="date-picker-brand-icon pr-9"
                    />
                    <CalendarIcon className="pointer-events-none absolute right-2.5 h-4 w-4 text-[#00C2A8]" aria-hidden />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        <FormField
          control={form.control}
          name="merchant"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Merchant name</FormLabel>
              <FormControl>
                <Input placeholder="Merchant name" {...field} />
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
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : mode === "create" ? "Add" : "Update"}
        </Button>
      </form>
    </Form>
  );
}
