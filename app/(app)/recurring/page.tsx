"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { RecurringForm, type RecurringFormValues } from "@/components/spendmeter/RecurringForm";
import {
  listRecurringTemplates,
  createRecurringTemplate,
  updateRecurringTemplate,
  deleteRecurringTemplate,
} from "@/lib/actions/recurring";
import { listCategories } from "@/lib/actions/categories";
import { listPaymentMethods } from "@/lib/actions/payment-methods";
import type { RecurringDTO } from "@/lib/actions/types";
import { Pencil, Power, PowerOff, Trash2 } from "lucide-react";

export default function RecurringPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<RecurringDTO[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; name: string }[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [tRes, cRes, pRes] = await Promise.all([
      listRecurringTemplates(),
      listCategories(),
      listPaymentMethods(),
    ]);
    if (tRes.ok) setTemplates(tRes.data.templates);
    if (cRes.ok) setCategories(cRes.data.categories.map((c) => ({ id: c.id, name: c.name })));
    if (pRes.ok)
      setPaymentMethods(
        pRes.data.methods
          .filter((m) => m.is_active)
          .map((m) => ({ id: m.id, name: m.name }))
      );
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const editing = editId ? templates.find((t) => t.id === editId) : null;

  async function handleAdd(values: RecurringFormValues) {
    const result = await createRecurringTemplate({
      name: values.name,
      amount: values.amount,
      due_day: values.due_day,
      category_id: values.category_id,
      merchant: values.merchant,
      payment_method_id: values.payment_method_id,
      is_active: true,
    });
    if (result.ok) {
      setAddOpen(false);
      await load();
      toast({ title: "Recurring item added" });
    } else {
      toast({
        title: "Failed to add",
        description: result.error.message,
        variant: "destructive",
      });
    }
  }

  async function handleEdit(values: RecurringFormValues) {
    if (!editId) return;
    const result = await updateRecurringTemplate({
      id: editId,
      name: values.name,
      amount: values.amount,
      due_day: values.due_day,
      category_id: values.category_id,
      merchant: values.merchant,
      payment_method_id: values.payment_method_id,
    });
    if (result.ok) {
      setEditId(null);
      await load();
      toast({ title: "Recurring item updated" });
    } else {
      toast({
        title: "Failed to update",
        description: result.error.message,
        variant: "destructive",
      });
    }
  }

  async function toggleActive(t: RecurringDTO) {
    const result = await updateRecurringTemplate({
      id: t.id,
      is_active: !t.is_active,
    });
    if (result.ok) {
      await load();
      toast({ title: "Updated" });
    } else {
      toast({
        title: "Failed to update",
        description: result.error.message,
        variant: "destructive",
      });
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteId) return;
    setDeleting(true);
    const result = await deleteRecurringTemplate(deleteId);
    setDeleting(false);
    if (result.ok) {
      setDeleteId(null);
      await load();
      toast({ title: "Recurring item deleted" });
    } else {
      toast({
        title: "Failed to delete",
        description: result.error.message,
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-10 w-16" />
        </div>
        <ul className="space-y-2">
          {[1, 2, 3].map((i) => (
            <li key={i}>
              <Card>
                <CardContent className="flex justify-between gap-2 py-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-9 w-20" />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Recurring Manager</h1>
        <Button onClick={() => setAddOpen(true)}>Add</Button>
      </div>
      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">No recurring items yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add monthly expenses that repeat (rent, subscriptions, etc.).
          </p>
          <Button className="mt-4" onClick={() => setAddOpen(true)}>
            Add first recurring
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {templates.map((t) => (
            <li key={t.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{t.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.merchant} · AED {t.amount.toLocaleString()} · Due day {t.due_day}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.category.name} · {t.payment_method.name}
                      {!t.is_active && " · (inactive)"}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => toggleActive(t)}
                      aria-label={t.is_active ? "Disable" : "Enable"}
                    >
                      {t.is_active ? (
                        <Power className="h-4 w-4" />
                      ) : (
                        <PowerOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => setEditId(t.id)}
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteId(t.id)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add recurring</DialogTitle>
          </DialogHeader>
          <RecurringForm
            key={addOpen ? "add-open" : "add-closed"}
            mode="create"
            categories={categories}
            paymentMethods={paymentMethods}
            onSubmit={handleAdd}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit recurring</DialogTitle>
          </DialogHeader>
          {editing && (
            <RecurringForm
              key={editId}
              mode="edit"
              initial={{
                name: editing.name,
                amount: editing.amount,
                due_day: editing.due_day,
                merchant: editing.merchant,
                category_id: editing.category.id,
                payment_method_id: editing.payment_method.id,
              }}
              categories={categories}
              paymentMethods={paymentMethods}
              onSubmit={handleEdit}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete recurring?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove the recurring template. Existing transactions created from it will not be deleted.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
