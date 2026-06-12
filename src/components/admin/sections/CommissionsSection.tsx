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
  Banknote,
  Settings2,
  List,
  CalendarDays,
  CheckCircle2,
  Clock,
  DollarSign,
  User,
  Wifi,
  TrendingUp,
  Loader2,
  Search,
  Filter,
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
import { Badge } from "@/components/ui/badge";

// ─── Types ───────────────────────────────────────────────
interface CommissionSetting {
  id: string;
  managerUid: string;
  managerName: string;
  networkId: string;
  networkName: string;
  defaultRate: number;
  provinceRates: Record<string, number>;
  districtRates: Record<string, number>;
  tierRates: Record<string, number>;
  updatedAt: number;
  updatedBy: string | null;
}

interface CommissionEntry {
  id: string;
  managerUid: string;
  managerName: string;
  networkId: string;
  networkName: string;
  cardId: string;
  cardTier: string;
  cardPrice: number;
  commissionRate: number;
  commissionAmount: number;
  provinceId: string;
  provinceName: string;
  district: string;
  soldAt: number;
  month: string;
  isPaid: boolean;
  paidAt: number | null;
}

interface MonthlyPayout {
  id: string;
  month: string;
  managerUid: string;
  managerName: string;
  networkId: string;
  networkName: string;
  totalCommission: number;
  totalCards: number;
  bankName: string | null;
  bankAccount: string | null;
  status: "pending" | "processing" | "paid" | "failed";
  paidAt: number | null;
  createdAt: number;
}

interface CommissionsSectionProps {
  managedNetwork?: string;
}

// ─── Sub-tab type ────────────────────────────────────────
type SubTab = "settings" | "entries" | "payouts";

// ─── Component ───────────────────────────────────────────
export function CommissionsSection({ managedNetwork }: CommissionsSectionProps) {
  const [activeTab, setActiveTab] = useState<SubTab>("entries");
  const [commissionSettings, setCommissionSettings] = useState<CommissionSetting[]>([]);
  const [commissionEntries, setCommissionEntries] = useState<CommissionEntry[]>([]);
  const [monthlyPayouts, setMonthlyPayouts] = useState<MonthlyPayout[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings form
  const [settingsDialog, setSettingsDialog] = useState(false);
  const [editingSetting, setEditingSetting] = useState<CommissionSetting | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    managerUid: "",
    managerName: "",
    networkId: "",
    networkName: "",
    defaultRate: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // ─── Load commission settings ──────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, "commissionSettings"), (snap) => {
      const data = snap.val() || {};
      let list: CommissionSetting[] = Object.entries(data).map(
        ([key, val]: [string, any]) => ({ id: key, ...val })
      );
      if (managedNetwork) {
        list = list.filter((s) => s.networkId === managedNetwork);
      }
      setCommissionSettings(list);
    });
    return () => unsub();
  }, [managedNetwork]);

  // ─── Load commission entries ───────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, "commissionEntries"), (snap) => {
      const data = snap.val() || {};
      let list: CommissionEntry[] = Object.entries(data)
        .map(([key, val]: [string, any]) => ({ id: key, ...val }))
        .sort((a, b) => (b.soldAt || 0) - (a.soldAt || 0));
      if (managedNetwork) {
        list = list.filter((e) => e.networkId === managedNetwork);
      }
      setCommissionEntries(list);
      setLoading(false);
    });
    return () => unsub();
  }, [managedNetwork]);

  // ─── Load monthly payouts ──────────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, "monthlyPayouts"), (snap) => {
      const data = snap.val() || {};
      let list: MonthlyPayout[] = Object.entries(data)
        .map(([key, val]: [string, any]) => ({ id: key, ...val }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      if (managedNetwork) {
        list = list.filter((p) => p.networkId === managedNetwork);
      }
      setMonthlyPayouts(list);
    });
    return () => unsub();
  }, [managedNetwork]);

  // ─── Open settings dialog ──────────────────────────────
  const openSettingsDialog = (setting?: CommissionSetting) => {
    if (setting) {
      setEditingSetting(setting);
      setSettingsForm({
        managerUid: setting.managerUid || "",
        managerName: setting.managerName || "",
        networkId: setting.networkId || "",
        networkName: setting.networkName || "",
        defaultRate: setting.defaultRate?.toString() || "",
      });
    } else {
      setEditingSetting(null);
      setSettingsForm({
        managerUid: "",
        managerName: "",
        networkId: managedNetwork || "",
        networkName: "",
        defaultRate: "",
      });
    }
    setSettingsDialog(true);
  };

  // ─── Save commission setting ───────────────────────────
  const handleSaveSetting = async () => {
    if (!settingsForm.managerUid || !settingsForm.defaultRate) {
      toast.error("يرجى ملء الحقول المطلوبة");
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        managerUid: settingsForm.managerUid,
        managerName: settingsForm.managerName,
        networkId: settingsForm.networkId,
        networkName: settingsForm.networkName,
        defaultRate: Number(settingsForm.defaultRate),
        provinceRates: {},
        districtRates: {},
        tierRates: {},
        updatedAt: Date.now(),
        updatedBy: auth.currentUser?.uid || null,
      };

      if (editingSetting) {
        await update(ref(db, `commissionSettings/${editingSetting.id}`), data);
        toast.success("تم تحديث إعدادات العمولة");
      } else {
        const newRef = push(ref(db, "commissionSettings"));
        await set(newRef, data);
        toast.success("تم إضافة إعدادات العمولة");
      }

      setSettingsDialog(false);
    } catch (err: any) {
      toast.error("حدث خطأ: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Mark payout as paid ───────────────────────────────
  const markPayoutPaid = async (payout: MonthlyPayout) => {
    try {
      await update(ref(db, `monthlyPayouts/${payout.id}`), {
        status: "paid",
        paidAt: Date.now(),
      });

      // Log activity
      const actRef = push(ref(db, "activityLog"));
      await set(actRef, {
        action: "payout_paid",
        user: auth.currentUser?.email || "admin",
        target: payout.managerName,
        details: `دفع عمولة ${payout.totalCommission} ريال - ${payout.month}`,
        timestamp: Date.now(),
      });

      toast.success("تم تسجيل الدفع بنجاح");
    } catch (err: any) {
      toast.error("حدث خطأ: " + err.message);
    }
  };

  // ─── Get unique months ─────────────────────────────────
  const uniqueMonths = Array.from(
    new Set(commissionEntries.map((e) => e.month).filter(Boolean))
  ).sort()
    .reverse();

  // ─── Filter entries ────────────────────────────────────
  const filteredEntries = commissionEntries.filter((e) => {
    const matchMonth = monthFilter === "all" || e.month === monthFilter;
    const matchSearch =
      !searchQuery ||
      e.managerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.networkName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.cardTier?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchMonth && matchSearch;
  });

  // ─── Calculate totals ──────────────────────────────────
  const totalUnpaid = commissionEntries
    .filter((e) => !e.isPaid)
    .reduce((sum, e) => sum + (e.commissionAmount || 0), 0);
  const totalPaid = commissionEntries
    .filter((e) => e.isPaid)
    .reduce((sum, e) => sum + (e.commissionAmount || 0), 0);

  const formatDate = (ts: number) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("ar-YE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const payoutStatusConfig: Record<string, { label: string; color: string }> = {
    pending: {
      label: "قيد الانتظار",
      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    },
    processing: {
      label: "قيد المعالجة",
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    },
    paid: {
      label: "مدفوع",
      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    },
    failed: {
      label: "فشل",
      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    },
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Banknote className="w-7 h-7 text-emerald-600" />
            العمولات
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            إدارة عمولات مديري الشبكات
          </p>
        </div>
        <Button
          onClick={() => openSettingsDialog()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5"
        >
          <Settings2 className="w-4 h-4" />
          إضافة إعداد عمولة
        </Button>
      </div>

      {/* ─── Stats ───────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 text-center"
        >
          <p className="text-xl font-black text-amber-700 dark:text-amber-300">
            {totalUnpaid.toLocaleString()}
          </p>
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1">
            ريال غير مدفوعة
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 text-center"
        >
          <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">
            {totalPaid.toLocaleString()}
          </p>
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
            ريال مدفوعة
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 text-center"
        >
          <p className="text-xl font-black text-blue-700 dark:text-blue-300">
            {commissionSettings.length}
          </p>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">
            إعدادات عمولة
          </p>
        </motion.div>
      </div>

      {/* ─── Sub-tab Navigation ──────────────────────────── */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
        {(
          [
            { key: "entries", label: "سجل العمولات", icon: List },
            { key: "payouts", label: "المدفوعات الشهرية", icon: CalendarDays },
            { key: "settings", label: "الإعدادات", icon: Settings2 },
          ] as { key: SubTab; label: string; icon: React.ElementType }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${
              activeTab === tab.key
                ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── Entries Tab ─────────────────────────────────── */}
      {activeTab === "entries" && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="بحث بالمدير أو الشبكة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9 rounded-xl"
              />
            </div>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-full sm:w-44 rounded-xl">
                <CalendarDays className="w-4 h-4 ml-2 text-gray-400" />
                <SelectValue placeholder="الشهر" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأشهر</SelectItem>
                {uniqueMonths.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <Banknote className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-slate-400 font-semibold">
                لا توجد سجلات عمولات
              </p>
            </motion.div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-440px)] overflow-y-auto scrollbar-thin">
              {filteredEntries.map((entry, idx) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className={`bg-white dark:bg-slate-900 rounded-xl border p-3 ${
                    entry.isPaid
                      ? "border-gray-200 dark:border-slate-800"
                      : "border-amber-200 dark:border-amber-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          entry.isPaid
                            ? "bg-emerald-100 dark:bg-emerald-900/30"
                            : "bg-amber-100 dark:bg-amber-900/30"
                        }`}
                      >
                        <DollarSign
                          className={`w-4 h-4 ${
                            entry.isPaid
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {entry.managerName} — {entry.cardTier}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {entry.networkName} • {entry.month} •{" "}
                          {formatDate(entry.soldAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {entry.commissionAmount?.toLocaleString()} ريال
                      </p>
                      <p className="text-[10px] text-gray-400">
                        ({entry.commissionRate}% من {entry.cardPrice})
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Payouts Tab ─────────────────────────────────── */}
      {activeTab === "payouts" && (
        <>
          {monthlyPayouts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <CalendarDays className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-slate-400 font-semibold">
                لا توجد مدفوعات شهرية
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-380px)] overflow-y-auto scrollbar-thin">
              {monthlyPayouts.map((payout, idx) => {
                const statusInfo =
                  payoutStatusConfig[payout.status] ||
                  payoutStatusConfig.pending;
                return (
                  <motion.div
                    key={payout.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4"
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${statusInfo.color}`}
                          >
                            {statusInfo.label}
                          </span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {payout.month}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                          <p className="text-gray-600 dark:text-slate-400">
                            <span className="text-gray-400">المدير: </span>
                            <span className="font-semibold">{payout.managerName}</span>
                          </p>
                          <p className="text-gray-600 dark:text-slate-400">
                            <span className="text-gray-400">الشبكة: </span>
                            <span className="font-semibold">{payout.networkName}</span>
                          </p>
                          <p className="text-gray-600 dark:text-slate-400">
                            <span className="text-gray-400">عدد البطاقات: </span>
                            <span className="font-semibold">{payout.totalCards}</span>
                          </p>
                          <p className="font-bold text-emerald-600 dark:text-emerald-400">
                            {payout.totalCommission?.toLocaleString()} ريال
                          </p>
                        </div>
                      </div>

                      {payout.status !== "paid" && (
                        <Button
                          size="sm"
                          onClick={() => markPayoutPaid(payout)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          تسجيل الدفع
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── Settings Tab ────────────────────────────────── */}
      {activeTab === "settings" && (
        <>
          {commissionSettings.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <Settings2 className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-slate-400 font-semibold">
                لا توجد إعدادات عمولة
              </p>
              <p className="text-sm text-gray-400 mt-1">
                أضف إعدادات عمولة جديدة لمدير شبكة
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {commissionSettings.map((setting, idx) => (
                <motion.div
                  key={setting.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-gray-900 dark:text-white">
                          {setting.managerName}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {setting.networkName}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openSettingsDialog(setting)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-emerald-600 transition-colors"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
                    <span className="text-sm text-gray-600 dark:text-slate-400">
                      نسبة العمولة
                    </span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {setting.defaultRate}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Settings Dialog ─────────────────────────────── */}
      <Dialog open={settingsDialog} onOpenChange={setSettingsDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <Settings2 className="w-5 h-5" />
              {editingSetting ? "تعديل إعدادات العمولة" : "إضافة إعدادات عمولة"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
                  معرف المدير <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="UID"
                  value={settingsForm.managerUid}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, managerUid: e.target.value })
                  }
                  className="rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
                  اسم المدير
                </label>
                <Input
                  placeholder="الاسم"
                  value={settingsForm.managerName}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, managerName: e.target.value })
                  }
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
                  معرف الشبكة
                </label>
                <Input
                  placeholder="Network ID"
                  value={settingsForm.networkId}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, networkId: e.target.value })
                  }
                  className="rounded-xl text-xs"
                  disabled={!!managedNetwork}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
                  اسم الشبكة
                </label>
                <Input
                  placeholder="اسم الشبكة"
                  value={settingsForm.networkName}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      networkName: e.target.value,
                    })
                  }
                  className="rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
                نسبة العمولة الافتراضية (%) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                placeholder="مثال: 10"
                value={settingsForm.defaultRate}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, defaultRate: e.target.value })
                }
                className="rounded-xl"
                min="0"
                max="100"
                step="0.5"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSettingsDialog(false)}
              className="rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSaveSetting}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {editingSetting ? "حفظ التعديلات" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
