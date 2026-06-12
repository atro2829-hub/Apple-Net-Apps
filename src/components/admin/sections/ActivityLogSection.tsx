"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  ClipboardList,
  Search,
  Filter,
  Clock,
  User,
  Zap,
  CreditCard,
  Receipt,
  Settings,
  Shield,
  Trash2,
  Plus,
  Pencil,
  CheckCircle2,
  XCircle,
  Banknote,
  Satellite,
  Globe,
  Building2,
  Package,
  ChevronLeft,
  ChevronRight,
  Activity,
  AlertTriangle,
  Info,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ───────────────────────────────────────────────
interface ActivityEntry {
  id: string;
  action: string;
  user: string;
  target: string;
  details: string;
  timestamp: number;
}

// ─── Action config ───────────────────────────────────────
const ACTION_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  deposit_approved: {
    label: "قبول إيداع",
    icon: CheckCircle2,
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  deposit_rejected: {
    label: "رفض إيداع",
    icon: XCircle,
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
  balance_credit: {
    label: "إيداع رصيد",
    icon: Plus,
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  balance_debit: {
    label: "سحب رصيد",
    icon: Receipt,
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  card_added: {
    label: "إضافة بطاقة",
    icon: CreditCard,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  user_created: {
    label: "إنشاء مستخدم",
    icon: User,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
  settings_updated: {
    label: "تحديث إعدادات",
    icon: Settings,
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  bank_added: {
    label: "إضافة بنك",
    icon: Building2,
    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  },
  bank_updated: {
    label: "تحديث بنك",
    icon: Pencil,
    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  },
  tier_added: {
    label: "إضافة فئة",
    icon: Plus,
    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  },
  tier_updated: {
    label: "تحديث فئة",
    icon: Pencil,
    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  },
  tier_deleted: {
    label: "حذف فئة",
    icon: Trash2,
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
  payout_paid: {
    label: "دفع عمولة",
    icon: Banknote,
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  starlink_product_added: {
    label: "إضافة منتج Starlink",
    icon: Satellite,
    color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  },
  starlink_product_updated: {
    label: "تحديث منتج Starlink",
    icon: Pencil,
    color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  },
  network_settings_updated: {
    label: "تحديث إعدادات شبكة",
    icon: Globe,
    color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  },
};

const DEFAULT_ACTION_CONFIG = {
  label: "إجراء",
  icon: Zap,
  color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

// ─── Action filter options ───────────────────────────────
const ACTION_FILTERS = [
  { value: "all", label: "كل الإجراءات" },
  { value: "deposit_approved", label: "قبول إيداع" },
  { value: "deposit_rejected", label: "رفض إيداع" },
  { value: "balance_credit", label: "إيداع رصيد" },
  { value: "balance_debit", label: "سحب رصيد" },
  { value: "card_added", label: "إضافة بطاقة" },
  { value: "user_created", label: "إنشاء مستخدم" },
  { value: "settings_updated", label: "تحديث إعدادات" },
  { value: "bank_added", label: "إضافة بنك" },
  { value: "tier_added", label: "إضافة فئة" },
  { value: "payout_paid", label: "دفع عمولة" },
];

// ─── Pagination ──────────────────────────────────────────
const PAGE_SIZE = 20;

// ─── Component ───────────────────────────────────────────
export function ActivityLogSection() {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [prevFilterKey, setPrevFilterKey] = useState("");

  // Track filter changes to reset page (avoiding setState in useEffect)
  const filterKey = `${actionFilter}-${searchQuery}`;
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setCurrentPage(1);
  }

  // ─── Load activity log ─────────────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, "activityLog"), (snap) => {
      if (!snap.exists()) {
        setExists(false);
        setActivities([]);
        setLoading(false);
        return;
      }
      setExists(true);
      const data = snap.val() || {};
      const list: ActivityEntry[] = Object.entries(data)
        .map(([key, val]: [string, any]) => ({
          id: key,
          ...val,
        }))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setActivities(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ─── Filter activities ─────────────────────────────────
  const filteredActivities = useMemo(() => {
    return activities.filter((a) => {
      const matchAction =
        actionFilter === "all" || a.action === actionFilter;
      const matchSearch =
        !searchQuery ||
        a.user?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.target?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.details?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchAction && matchSearch;
    });
  }, [activities, actionFilter, searchQuery]);

  // ─── Pagination ────────────────────────────────────────
  const totalPages = Math.ceil(filteredActivities.length / PAGE_SIZE);
  const paginatedActivities = filteredActivities.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // ─── Format date ────────────────────────────────────────
  const formatDate = (ts: number) => {
    if (!ts) return "—";
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "الآن";
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;

    return date.toLocaleDateString("ar-YE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ─── Get action config ─────────────────────────────────
  const getActionConfig = (action: string) => {
    return ACTION_CONFIG[action] || DEFAULT_ACTION_CONFIG;
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-emerald-600" />
            سجل النشاط
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            سجل جميع العمليات والإجراءات
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-slate-400">
            {filteredActivities.length} سجل
          </span>
        </div>
      </div>

      {/* ─── Placeholder when no activityLog exists ──────── */}
      {!exists && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-8 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">
            سجل النشاط غير موجود
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto mb-4">
            لم يتم إنشاء سجل النشاط بعد في قاعدة البيانات. ستظهر السجلات هنا
            تلقائياً عند تنفيذ إجراءات الإدارة مثل قبول الإيداعات أو إضافة
            بطاقات.
          </p>
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl max-w-md mx-auto text-right">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <p>الإجراءات المسجلة تلقائياً:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>قبول/رفض الإيداعات</li>
                <li>إيداع/سحب الأرصدة</li>
                <li>إضافة/تحديث البنوك والفئات</li>
                <li>تحديث الإعدادات</li>
                <li>دفع العمولات</li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Filters ─────────────────────────────────────── */}
      {exists && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="بحث بالمستخدم أو الهدف أو التفاصيل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 rounded-xl"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-52 rounded-xl">
              <Filter className="w-4 h-4 ml-2 text-gray-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ─── Activity List ───────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : exists && filteredActivities.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <Activity className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-slate-400 font-semibold">
            لا توجد سجلات مطابقة
          </p>
          <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
            جرّب تغيير معايير البحث أو الفلتر
          </p>
        </motion.div>
      ) : (
        exists && (
          <>
            <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto scrollbar-thin">
              {paginatedActivities.map((activity, idx) => {
                const config = getActionConfig(activity.action);
                const IconComp = config.icon;

                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {config.label}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate">
                              {activity.details || activity.target}
                            </p>
                          </div>
                          <span className="text-[10px] text-gray-400 dark:text-slate-500 whitespace-nowrap flex-shrink-0">
                            {formatDate(activity.timestamp)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 dark:text-slate-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {activity.user}
                          </span>
                          {activity.target && (
                            <span className="truncate">
                              ← {activity.target}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* ─── Pagination ───────────────────────────────── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  عرض{" "}
                  {(currentPage - 1) * PAGE_SIZE + 1} -{" "}
                  {Math.min(currentPage * PAGE_SIZE, filteredActivities.length)}{" "}
                  من {filteredActivities.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) => Math.max(1, p - 1))
                    }
                    disabled={currentPage === 1}
                    className="rounded-xl gap-1"
                  >
                    <ChevronRight className="w-4 h-4" />
                    السابق
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
                            currentPage === page
                              ? "bg-emerald-600 text-white"
                              : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="rounded-xl gap-1"
                  >
                    التالي
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
