"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import {
  ref,
  set,
  get,
  push,
  update,
  remove,
  onValue,
  runTransaction,
} from "firebase/database";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Hash,
  User,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

// ─── Types ───────────────────────────────────────────────
interface BankDetail {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  isActive: boolean;
  createdAt?: number;
}

// ─── Component ───────────────────────────────────────────
export function BanksSection() {
  const [banks, setBanks] = useState<BankDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<BankDetail | null>(null);
  const [editingBank, setEditingBank] = useState<BankDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    bankName: "",
    accountName: "",
    accountNumber: "",
    isActive: true,
  });

  // ─── Load banks ────────────────────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, "banks"), (snap) => {
      const data = snap.val() || {};
      const list: BankDetail[] = Object.entries(data)
        .map(([key, val]: [string, any]) => ({
          id: key,
          ...val,
        }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setBanks(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ─── Open add dialog ───────────────────────────────────
  const openAddDialog = () => {
    setEditingBank(null);
    setForm({ bankName: "", accountName: "", accountNumber: "", isActive: true });
    setDialogOpen(true);
  };

  // ─── Open edit dialog ──────────────────────────────────
  const openEditDialog = (bank: BankDetail) => {
    setEditingBank(bank);
    setForm({
      bankName: bank.bankName || "",
      accountName: bank.accountName || "",
      accountNumber: bank.accountNumber || "",
      isActive: bank.isActive ?? true,
    });
    setDialogOpen(true);
  };

  // ─── Save bank ─────────────────────────────────────────
  const handleSave = async () => {
    if (!form.bankName || !form.accountName || !form.accountNumber) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    setSubmitting(true);
    try {
      const bankData = {
        bankName: form.bankName,
        accountName: form.accountName,
        accountNumber: form.accountNumber,
        isActive: form.isActive,
      };

      if (editingBank) {
        await update(ref(db, `banks/${editingBank.id}`), bankData);
        toast.success("تم تحديث البنك بنجاح");
      } else {
        const newRef = push(ref(db, "banks"));
        await set(newRef, { ...bankData, createdAt: Date.now() });
        toast.success("تم إضافة البنك بنجاح");
      }

      const actRef = push(ref(db, "activityLog"));
      await set(actRef, {
        action: editingBank ? "bank_updated" : "bank_added",
        user: auth.currentUser?.email || "admin",
        target: form.bankName,
        details: `${form.bankName} - ${form.accountNumber}`,
        timestamp: Date.now(),
      });

      setDialogOpen(false);
    } catch (err: any) {
      toast.error("حدث خطأ: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Toggle bank active ────────────────────────────────
  const toggleActive = async (bank: BankDetail) => {
    try {
      await update(ref(db, `banks/${bank.id}`), { isActive: !bank.isActive });
      toast.success(bank.isActive ? "تم تعطيل البنك" : "تم تفعيل البنك");
    } catch (err: any) {
      toast.error("حدث خطأ: " + err.message);
    }
  };

  // ─── Delete bank ───────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteDialog) return;
    setSubmitting(true);
    try {
      await remove(ref(db, `banks/${deleteDialog.id}`));
      toast.success("تم حذف البنك بنجاح");
      setDeleteDialog(null);
    } catch (err: any) {
      toast.error("حدث خطأ: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const activeCount = banks.filter((b) => b.isActive).length;

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-7 h-7 text-emerald-600" />
            الحسابات البنكية
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            إدارة الحسابات البنكية للإيداعات
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm font-bold">
            <CheckCircle2 className="w-4 h-4" />
            {activeCount} نشط
          </div>
          <Button
            onClick={openAddDialog}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5"
          >
            <Plus className="w-4 h-4" />
            إضافة بنك
          </Button>
        </div>
      </div>

      {/* ─── Banks Grid ──────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : banks.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <Building2 className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-slate-400 font-semibold">لا توجد حسابات بنكية</p>
          <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">أضف حساب بنكي جديد للبدء</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {banks.map((bank, idx) => (
            <motion.div
              key={bank.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`relative bg-white dark:bg-slate-900 rounded-2xl border overflow-hidden transition-all hover:shadow-lg group ${
                bank.isActive ? "border-gray-200 dark:border-slate-800" : "border-gray-200 dark:border-slate-800 opacity-60"
              }`}
            >
              {/* Status strip */}
              <div className={`h-1.5 ${bank.isActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-slate-700"}`} />

              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      bank.isActive ? "bg-emerald-50 dark:bg-emerald-900/30" : "bg-gray-100 dark:bg-slate-800"
                    }`}>
                      <Building2 className={`w-5 h-5 ${
                        bank.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-slate-500"
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-gray-900 dark:text-white">{bank.bankName}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        bank.isActive
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        {bank.isActive ? "نشط" : "معطّل"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2.5 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-500 dark:text-slate-400">اسم الحساب:</span>
                    <span className="font-semibold text-gray-900 dark:text-white truncate">{bank.accountName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-500 dark:text-slate-400">رقم الحساب:</span>
                    <span className="font-mono font-semibold text-gray-900 dark:text-white text-xs">{bank.accountNumber}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-800">
                  <button
                    onClick={() => toggleActive(bank)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    {bank.isActive ? (
                      <ToggleRight className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-4 h-4" />
                    )}
                    {bank.isActive ? "تعطيل" : "تفعيل"}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditDialog(bank)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-emerald-600 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteDialog(bank)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ─── Add/Edit Dialog ─────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <Building2 className="w-5 h-5" />
              {editingBank ? "تعديل الحساب البنكي" : "إضافة حساب بنكي جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
                اسم البنك <span className="text-red-500">*</span>
              </label>
              <Input placeholder="مثال: بنك الكريمي" value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })} className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
                اسم صاحب الحساب <span className="text-red-500">*</span>
              </label>
              <Input placeholder="الاسم الكامل" value={form.accountName}
                onChange={(e) => setForm({ ...form, accountName: e.target.value })} className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
                رقم الحساب <span className="text-red-500">*</span>
              </label>
              <Input placeholder="رقم الحساب البنكي" value={form.accountNumber}
                onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} className="rounded-xl font-mono" />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
              <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">تفعيل الحساب</span>
              <Switch checked={form.isActive} onCheckedChange={(val) => setForm({ ...form, isActive: val })} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">إلغاء</Button>
            <Button onClick={handleSave} disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {editingBank ? "حفظ التعديلات" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─────────────────────────── */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => { if (!open) setDeleteDialog(null); }}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              تأكيد الحذف
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-slate-400 py-2">
            هل أنت متأكد من حذف حساب <span className="font-bold text-gray-900 dark:text-white">{deleteDialog?.bankName}</span>؟
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog(null)} className="rounded-xl">إلغاء</Button>
            <Button onClick={handleDelete} disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl gap-1">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
