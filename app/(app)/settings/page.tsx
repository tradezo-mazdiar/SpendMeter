"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getSessionProfile, updateProfileDisplayName } from "@/lib/actions/profile";
import {
  listPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from "@/lib/actions/payment-methods";
import { getActiveMonth, updateActiveMonthLimit } from "@/lib/actions/months";
import type { PaymentMethodDTO } from "@/lib/actions/payment-methods";
import { LogOut, CreditCard, Pencil, Trash2, Power, PowerOff } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";


export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [methods, setMethods] = useState<PaymentMethodDTO[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addType, setAddType] = useState<"credit" | "debit">("debit");
  const [addCardLimit, setAddCardLimit] = useState("");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<"credit" | "debit" | "cash">("debit");
  const [editCardLimit, setEditCardLimit] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [monthlyLimit, setMonthlyLimit] = useState<number | null>(null);
  const [monthId, setMonthId] = useState<string | null>(null);
  const [editingMonthlyLimit, setEditingMonthlyLimit] = useState(false);
  const [monthlyLimitInput, setMonthlyLimitInput] = useState("");
  const [savingMonthlyLimit, setSavingMonthlyLimit] = useState(false);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    const res = await getSessionProfile();
    if (res.ok) {
      setDisplayName(res.data.display_name ?? "");
    }
    setProfileLoading(false);
  }, []);

  const loadMethods = useCallback(async () => {
    setMethodsLoading(true);
    const res = await listPaymentMethods();
    if (res.ok) setMethods(res.data.methods);
    setMethodsLoading(false);
  }, []);

  const loadMonthlyLimit = useCallback(async () => {
    const res = await getActiveMonth();
    if (res.ok) {
      setMonthId(res.data.id);
      setMonthlyLimit(res.data.spending_limit);
      setMonthlyLimitInput(String(res.data.spending_limit));
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    loadMethods();
  }, [loadMethods]);

  useEffect(() => {
    loadMonthlyLimit();
  }, [loadMonthlyLimit]);

  useEffect(() => {
    if (addOpen) {
      setAddName("");
      setAddType("debit");
      setAddCardLimit("");
    }
  }, [addOpen]);

  async function handleSaveName() {
    setSavingName(true);
    const res = await updateProfileDisplayName({
      display_name: displayName.trim() || null,
    });
    setSavingName(false);
    if (res.ok) {
      toast({ title: "Display name updated" });
    } else {
      toast({
        title: "Failed to update",
        description: res.error.message,
        variant: "destructive",
      });
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function openEdit(m: PaymentMethodDTO) {
    setEditId(m.id);
    setEditName(m.name);
    setEditType(m.type);
    setEditCardLimit(m.card_limit != null ? String(m.card_limit) : "");
  }

  async function handleAddPaymentMethod() {
    const name = addName.trim();
    if (!name) {
      toast({ title: "Enter a name", variant: "destructive" });
      return;
    }
    setAdding(true);
    const cardLimit =
      addCardLimit.trim() !== "" && Number.isFinite(Number(addCardLimit))
        ? Number(addCardLimit)
        : null;
    const res = await createPaymentMethod({
      name,
      type: addType,
      card_limit: cardLimit,
    });
    setAdding(false);
    if (res.ok) {
      setAddOpen(false);
      setAddName("");
      setAddType("debit");
      setAddCardLimit("");
      await loadMethods();
      toast({ title: "Payment method added" });
    } else {
      toast({
        title: "Failed to add",
        description: res.error.message,
        variant: "destructive",
      });
    }
  }

  async function handleSaveEdit() {
    if (!editId) return;
    const name = editName.trim();
    if (!name) {
      toast({ title: "Enter a name", variant: "destructive" });
      return;
    }
    setSavingEdit(true);
    const cardLimit =
      editCardLimit.trim() !== "" && Number.isFinite(Number(editCardLimit))
        ? Number(editCardLimit)
        : null;
    const res = await updatePaymentMethod({
      id: editId,
      name,
      type: editType,
      card_limit: cardLimit,
    });
    setSavingEdit(false);
    if (res.ok) {
      setEditId(null);
      await loadMethods();
      toast({ title: "Payment method updated" });
    } else {
      toast({
        title: "Failed to update",
        description: res.error.message,
        variant: "destructive",
      });
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await deletePaymentMethod(deleteId);
    setDeleting(false);
    if (res.ok) {
      setDeleteId(null);
      await loadMethods();
      toast({ title: "Payment method deleted" });
    } else {
      toast({
        title: "Failed to delete",
        description: res.error.message,
        variant: "destructive",
      });
    }
  }

  async function toggleMethodActive(m: PaymentMethodDTO) {
    const res = await updatePaymentMethod({
      id: m.id,
      is_active: !m.is_active,
    });
    if (res.ok) {
      await loadMethods();
      toast({ title: m.is_active ? "Disabled" : "Enabled" });
    } else {
      toast({
        title: "Failed to update",
        description: res.error.message,
        variant: "destructive",
      });
    }
  }

  async function handleSaveMonthlyLimit() {
    if (!monthId) return;
    const value = Number(monthlyLimitInput);
    if (!Number.isFinite(value) || value < 0) {
      toast({ title: "Invalid limit", variant: "destructive" });
      return;
    }
    setSavingMonthlyLimit(true);
    const res = await updateActiveMonthLimit({ spending_limit: value });
    setSavingMonthlyLimit(false);
    if (res.ok) {
      setMonthlyLimit(value);
      setEditingMonthlyLimit(false);
      toast({ title: "Monthly limit updated" });
    } else {
      toast({
        title: "Failed to update",
        description: res.error.message,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-xl font-semibold">Settings</h1>

      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-sm font-medium text-muted-foreground">Profile</h2>
        </CardHeader>
        <CardContent className="space-y-2">
          {profileLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <label className="text-sm font-medium">Display name</label>
              <div className="flex gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="max-w-xs"
                />
                <Button
                  size="sm"
                  onClick={handleSaveName}
                  disabled={savingName || (displayName.trim() || "") === ""}
                >
                  {savingName ? "Saving…" : "Save"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Monthly spending limit
          </h2>
        </CardHeader>
        <CardContent className="space-y-2">
          {monthlyLimit === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : editingMonthlyLimit ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="number"
                min={0}
                step={100}
                className="w-36"
                value={monthlyLimitInput}
                onChange={(e) => setMonthlyLimitInput(e.target.value)}
              />
              <Button
                size="sm"
                onClick={handleSaveMonthlyLimit}
                disabled={savingMonthlyLimit}
              >
                {savingMonthlyLimit ? "Saving…" : "Save"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingMonthlyLimit(false);
                  setMonthlyLimitInput(String(monthlyLimit));
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm">
                AED {monthlyLimit.toLocaleString()}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary hover:text-primary"
                onClick={() => setEditingMonthlyLimit(true)}
                aria-label="Edit monthly limit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Payment methods
          </h2>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            Add
          </Button>
        </CardHeader>
        <CardContent>
          {methodsLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : methods.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No payment methods yet. Add a card or cash.
            </p>
          ) : (
            <ul className="space-y-2">
              {methods.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {m.type === "cash" ? (
                      <span className="text-base font-semibold text-muted-foreground">
                        AED
                      </span>
                    ) : (
                      <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="font-medium truncate">{m.name}</span>
                    <span className="text-xs text-muted-foreground capitalize shrink-0">
                      {m.type}
                    </span>
                    {m.card_limit != null && m.type !== "cash" && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        · AED {Number(m.card_limit).toLocaleString()}
                      </span>
                    )}
                    {!m.is_active && (
                      <span className="text-xs text-muted-foreground shrink-0">(inactive)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => toggleMethodActive(m)}
                      aria-label={m.is_active ? "Disable" : "Enable"}
                    >
                      {m.is_active ? (
                        <Power className="h-4 w-4" />
                      ) : (
                        <PowerOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => openEdit(m)}
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteId(m.id)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Button
            variant="outline"
            className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {loggingOut ? "Signing out…" : "Log out"}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add payment method</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. Main Card, Debit Card"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <p className="mt-1 text-xs text-muted-foreground">
                Cash is already available by default.
              </p>
              <Tabs
                value={addType}
                onValueChange={(v) => setAddType(v as "credit" | "debit")}
                className="mt-2"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="credit">Credit</TabsTrigger>
                  <TabsTrigger value="debit">Debit</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div>
              <label className="text-sm font-medium">Card limit (optional)</label>
              <Input
                type="number"
                min={0}
                step={100}
                placeholder="e.g. 10000"
                value={addCardLimit}
                onChange={(e) => setAddCardLimit(e.target.value)}
                className="mt-1"
              />
              <p className="mt-0.5 text-xs text-muted-foreground">
                Leave empty if no limit. Used to track spent vs remaining.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddPaymentMethod}
                disabled={adding || !addName.trim()}
              >
                {adding ? "Adding…" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit payment method</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1"
              />
            </div>
            {editType !== "cash" && (
              <div>
                <label className="text-sm font-medium">Card limit (optional)</label>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  placeholder="e.g. 10000"
                  value={editCardLimit}
                  onChange={(e) => setEditCardLimit(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditId(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={savingEdit || !editName.trim()}>
                {savingEdit ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete payment method?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This cannot be undone. If this method is used in any transactions, deletion will fail.
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
