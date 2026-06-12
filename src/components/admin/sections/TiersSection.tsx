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
  Star,
  Plus,
  Pencil,
  Trash2,
  Wifi,
  Clock,
  DollarSign,
  Loader2,
  Package,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ───────────────────────────────────────────────
interface TierItem {
  id: string;
  tier: string;
  price: number;
  data: string;
  duration: number;
  icon: string;
  createdAt: number;
}

interface TiersSectionProps {
  managedNetwork?: string;
}

// ─── Icon options ────────────────────────────────────────
const ICON_OPTIONS = [
  { value: "wifi", label: "واي فاي" },
  { value: "zap", label: "سريع" },
  { value: "globe", label: "عالمي" },
  { value: "signal", label: "إشارة" },
  { value: "rocket", label: "صاروخ" },
  { value: "crown", label: "تاج" },
  { value: "diamond", label: "ماسي" },
  { value: "star", label: "نجمة" },
];

// ─── Component ───────────────────────────────────────────
export function TiersSection({ managedNetwork }: TiersSectionProps) {
  const [tiers, setTiers] = useState<TierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<TierItem | null>(null);
  const [editingTier, setEditingTier] = useState<TierItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    tier: "",
    price: "",
    data: "",
    duration: "",
    icon: "wifi",
  });

  // ─── Determine path based on managedNetwork ────────────
  const tiersPath = managedNetwork
    ? `networkTiers/${managedNetwork}`
    : "tiers";

  // ─── Load tiers ────────────────────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, tiersPath), (snap) => {
      const data = snap.val() || {};
      const list: TierItem[] = Object.entries(data)
        .map(([key, val]: [string, any]) => ({
          id: key,
          ...val,
        }))
        .sort((a, b) => (a.price || 0) - (b.price || 0));
      setTiers(list);
      setLoading(false);
    });
    return () => unsub();
  }, [tiersPath]);

  // ─── Open add dialog ───────────────────────────────────
  const openAddDialog = () => {
    setEditingTier(null);
    setForm({ tier: "", price: "", data: "", duration: "", icon: "wifi" });
    setDialogOpen(true);
  };

  // ─── Open edit dialog ──────────────────────────────────
  const openEditDialog = (tier: TierItem) => {
    setEditingTier(tier);
    setForm({
      tier: tier.tier || "",
      price: tier.price?.toString() || "",
      data: tier.data || "",
      duration: tier.duration?.toString() || "",
      icon: tier.icon || "wifi",
    });
    setDialogOpen(true);
  };

  // ─── Save tier ─────────────────────────────────────────
  const handleSave = async () => {
    if (!form.tier || !form.price || !form.data || !form.duration) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }

    setSubmitting(true);
    try {
      if (editingTier) {
        await update(ref(db, `${tiersPath}/${editingTier.id}`), {
          tier: form.tier,
          price: Number(form.price),
          data: form.data,
          duration: Number(form.duration),
          icon: form.icon,
        });
        toast.success("تم تحديث الفئة بنجاح");
      } else {
        const newRef = push(ref(db, tiersPath));
        await set(newRef, {
          tier: form.tier,
          price: Number(form.price),
          data: form.data,
          duration: Number(form.duration),
          icon: form.icon,
          createdAt: Date.now(),
        });
        toast.success("تم إضافة الفئة بنجاح");
      }

      // Log activity
      const actRef = push(ref(db, "activityLog"));
      await set(actRef, {
        action: editingTier ? "tier_updated" : "tier_added",
        user: auth.currentUser?.email || "admin",
        target: form.tier,
        details: `${form.tier} - ${form.price} ريال`,
        timestamp: Date.now(),
      });

      setDialogOpen(false);
    } catch (err: any) {
      toast.error("حدث خطأ: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Delete tier ───────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteDialog) return;
    setSubmitting(true);
    try {
      await remove(ref(db, `${tiersPath}/${deleteDialog.id}`));

      const actRef = push(ref(db, "activityLog"));
      await set(actRef, {
        action: "tier_deleted",
        user: auth.currentUser?.email || "admin",
        target: deleteDialog.tier,
        details: `حذف فئة ${deleteDialog.tier}`,
        timestamp: Date.now(),
      });

      toast.success("تم حذف الفئة بنجاح");
      setDeleteDialog(null);
    } catch (err: any) {
      toast.error("حدث خطأ: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Star className="w-7 h-7 text-emerald-600" />
            {managedNetwork ? "فئات الشبكة" : "فئات الأسعار"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {managedNetwork
              ? "إدارة فئات الأسعار الخاصة بالشبكة"
              : "إدارة فئات أسعار البطاقات"}
          </p>
        </div>
        <Button
          onClick={openAddDialog}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5"
        >
          <Plus className="w-4 h-4" />
          إضافة فئة
        </Button>
      </div>

      {/* ─── Tiers Grid ──────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tiers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <Star className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-slate-400 font-semibold">
            لا توجد فئات أسعار
          </p>
          <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
            أضف فئة جديدة للبدء
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiers.map((tier, idx) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="relative bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group"
            >
              {/* Top badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Wifi className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditDialog(tier)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-emerald-600 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteDialog(tier)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tier Name */}
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-3">
                {tier.tier}
              </h3>

              {/* Details */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-gray-500 dark:text-slate-400">
                    <DollarSign className="w-3.5 h-3.5" />
                    السعر
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {tier.price?.toLocaleString()} ريال
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-gray-500 dark:text-slate-400">
                    <Package className="w-3.5 h-3.5" />
                    البيانات
                  </span>
                  <span className="font-semibold text-gray-700 dark:text-slate-300">
                    {tier.data}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-gray-500 dark:text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    المدة
                  </span>
                  <span className="font-semibold text-gray-700 dark:text-slate-300">
                    {tier.duration} يوم
                  </span>
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
              <Star className="w-5 h-5" />
              {editingTier ? "تعديل الفئة" : "إضافة فئة جديدة"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
                اسم الفئة <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="مثال: فئة 500 ريال"
                value={form.tier}
                onChange={(e) => setForm({ ...form, tier: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
                  السعر (ريال) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="rounded-xl"
                  min="0"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
                  المدة (يوم) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  placeholder="30"
                  value={form.duration}
                  onChange={(e) =>
                    setForm({ ...form, duration: e.target.value })
                  }
                  className="rounded-xl"
                  min="1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
                كمية البيانات <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="مثال: 10 جيجا"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
                الأيقونة
              </label>
              <Select
                value={form.icon}
                onValueChange={(val) => setForm({ ...form, icon: val })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSave}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {editingTier ? "حفظ التعديلات" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─────────────────────────── */}
      <Dialog
        open={!!deleteDialog}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              تأكيد الحذف
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-slate-400 py-2">
            هل أنت متأكد من حذف فئة{" "}
            <span className="font-bold text-gray-900 dark:text-white">
              {deleteDialog?.tier}
            </span>
            ؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog(null)}
              className="rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl gap-1"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
