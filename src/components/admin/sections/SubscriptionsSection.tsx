"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import { ref, set, get, push, update, remove, onValue } from "firebase/database";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Crown,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Users,
  CalendarDays,
  DollarSign,
  Clock,
  Search,
  Filter,
  XCircle,
  Tag,
  CheckCircle2,
  X,
  RefreshCw,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ───────────────────────────────────────────────
interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  description: string;
  durationDays: number;
  isActive: boolean;
  createdAt?: number;
}

interface UserSubscription {
  id: string;
  userId: string;
  userName: string;
  planId: string;
  planName: string;
  activatedAt: number;
  expiresAt: number;
  isActive: boolean;
  autoRenew: boolean;
}

// ─── Component ───────────────────────────────────────────
export function SubscriptionsSection() {
  const [activeTab, setActiveTab] = useState<"plans" | "users">("plans");

  // ─── Plans State ──────────────────────────────────────
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<SubscriptionPlan | null>(null);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planSubmitting, setPlanSubmitting] = useState(false);
  const [planForm, setPlanForm] = useState({
    name: "",
    price: "",
    description: "",
    durationDays: "",
    isActive: true,
  });

  // ─── User Subscriptions State ─────────────────────────
  const [userSubs, setUserSubs] = useState<UserSubscription[]>([]);
  const [userSubsLoading, setUserSubsLoading] = useState(true);
  const [subFilter, setSubFilter] = useState<"all" | "active" | "expired">("all");
  const [subSearch, setSubSearch] = useState("");
  const [cancelDialog, setCancelDialog] = useState<UserSubscription | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // ─── Load Plans ────────────────────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, "subscriptionPlans"), (snap) => {
      const data = snap.val() || {};
      const list: SubscriptionPlan[] = Object.entries(data)
        .map(([key, val]: [string, any]) => ({
          id: key,
          ...val,
        }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setPlans(list);
      setPlansLoading(false);
    });
    return () => unsub();
  }, []);

  // ─── Load User Subscriptions ──────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, "userSubscriptions"), (snap) => {
      const data = snap.val() || {};
      const list: UserSubscription[] = [];
      Object.entries(data).forEach(([uid, userSubsData]: [string, any]) => {
        if (typeof userSubsData === "object" && userSubsData !== null) {
          Object.entries(userSubsData).forEach(([subId, subData]: [string, any]) => {
            list.push({
              id: subId,
              userId: uid,
              ...subData,
            });
          });
        }
      });
      list.sort((a, b) => (b.activatedAt || 0) - (a.activatedAt || 0));
      setUserSubs(list);
      setUserSubsLoading(false);
    });
    return () => unsub();
  }, []);

  // ─── Plan CRUD ─────────────────────────────────────────
  const openAddPlan = () => {
    setEditingPlan(null);
    setPlanForm({ name: "", price: "", description: "", durationDays: "", isActive: true });
    setPlanDialogOpen(true);
  };

  const openEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name || "",
      price: String(plan.price || ""),
      description: plan.description || "",
      durationDays: String(plan.durationDays || ""),
      isActive: plan.isActive ?? true,
    });
    setPlanDialogOpen(true);
  };

  const handleSavePlan = async () => {
    if (!planForm.name.trim() || !planForm.price || !planForm.durationDays) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    const priceVal = parseFloat(planForm.price);
    const daysVal = parseInt(planForm.durationDays);
    if (isNaN(priceVal) || priceVal <= 0) {
      toast.error("يرجى إدخال سعر صحيح");
      return;
    }
    if (isNaN(daysVal) || daysVal <= 0) {
      toast.error("يرجى إدخال مدة صحيحة بالأيام");
      return;
    }

    setPlanSubmitting(true);
    try {
      const planData = {
        name: planForm.name.trim(),
        price: priceVal,
        description: planForm.description.trim(),
        durationDays: daysVal,
        isActive: planForm.isActive,
      };

      if (editingPlan) {
        await update(ref(db, `subscriptionPlans/${editingPlan.id}`), planData);
        toast.success("تم تحديث الخطة بنجاح");
      } else {
        const newRef = push(ref(db, "subscriptionPlans"));
        await set(newRef, { ...planData, createdAt: Date.now() });
        toast.success("تم إضافة الخطة بنجاح");
      }

      const actRef = push(ref(db, "activityLog"));
      await set(actRef, {
        action: editingPlan ? "plan_updated" : "plan_added",
        user: auth.currentUser?.email || "admin",
        target: planForm.name,
        details: `${planForm.name} - ${priceVal} ريال - ${daysVal} يوم`,
        timestamp: Date.now(),
      });

      setPlanDialogOpen(false);
    } catch (err: any) {
      toast.error("حدث خطأ: " + err.message);
    } finally {
      setPlanSubmitting(false);
    }
  };

  const togglePlanActive = async (plan: SubscriptionPlan) => {
    try {
      await update(ref(db, `subscriptionPlans/${plan.id}`), { isActive: !plan.isActive });
      toast.success(plan.isActive ? "تم تعطيل الخطة" : "تم تفعيل الخطة");
    } catch (err: any) {
      toast.error("حدث خطأ: " + err.message);
    }
  };

  const handleDeletePlan = async () => {
    if (!deleteDialog) return;
    setPlanSubmitting(true);
    try {
      await remove(ref(db, `subscriptionPlans/${deleteDialog.id}`));
      toast.success("تم حذف الخطة بنجاح");

      const actRef = push(ref(db, "activityLog"));
      await set(actRef, {
        action: "plan_deleted",
        user: auth.currentUser?.email || "admin",
        target: deleteDialog.name,
        details: `حذف خطة ${deleteDialog.name}`,
        timestamp: Date.now(),
      });

      setDeleteDialog(null);
    } catch (err: any) {
      toast.error("حدث خطأ: " + err.message);
    } finally {
      setPlanSubmitting(false);
    }
  };

  // ─── Cancel Subscription ──────────────────────────────
  const handleCancelSub = async () => {
    if (!cancelDialog) return;
    setCancelSubmitting(true);
    try {
      await update(ref(db, `userSubscriptions/${cancelDialog.userId}/${cancelDialog.id}`), {
        isActive: false,
        autoRenew: false,
      });

      // Send notification to user
      const notifRef = push(ref(db, `notifications/${cancelDialog.userId}`));
      await set(notifRef, {
        type: "subscription",
        title: "تم إلغاء الاشتراك",
        message: `تم إلغاء اشتراكك في خطة "${cancelDialog.planName}"`,
        isRead: false,
        createdAt: Date.now(),
      });

      const actRef = push(ref(db, "activityLog"));
      await set(actRef, {
        action: "subscription_cancelled",
        user: auth.currentUser?.email || "admin",
        target: cancelDialog.userName,
        details: `إلغاء اشتراك ${cancelDialog.planName}`,
        timestamp: Date.now(),
      });

      toast.success("تم إلغاء الاشتراك بنجاح");
      setCancelDialog(null);
    } catch (err: any) {
      toast.error("حدث خطأ: " + err.message);
    } finally {
      setCancelSubmitting(false);
    }
  };

  // ─── Filter user subscriptions ────────────────────────
  const filteredUserSubs = userSubs.filter((sub) => {
    const now = Date.now();
    const isCurrentlyActive = sub.isActive && sub.expiresAt > now;
    const matchFilter =
      subFilter === "all" ||
      (subFilter === "active" && isCurrentlyActive) ||
      (subFilter === "expired" && !isCurrentlyActive);
    const matchSearch =
      !subSearch ||
      sub.userName?.toLowerCase().includes(subSearch.toLowerCase()) ||
      sub.planName?.toLowerCase().includes(subSearch.toLowerCase());
    return matchFilter && matchSearch;
  });

  const activeSubsCount = userSubs.filter((s) => s.isActive && s.expiresAt > Date.now()).length;
  const expiredSubsCount = userSubs.filter((s) => !s.isActive || s.expiresAt <= Date.now()).length;

  // ─── Format date ────────────────────────────────────────
  const formatDate = (ts: number) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("ar-YE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ─── Duration label ─────────────────────────────────────
  const durationLabel = (days: number) => {
    if (days === 30) return "شهري";
    if (days === 90) return "ربع سنوي";
    if (days === 365) return "سنوي";
    if (days === 7) return "أسبوعي";
    return `${days} يوم`;
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Crown className="w-7 h-7 text-emerald-600" />
            إدارة الاشتراكات
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            إدارة خطط الاشتراك واشتراكات المستخدمين
          </p>
        </div>
      </div>

      {/* ─── Tab Buttons ─────────────────────────────────── */}
      <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("plans")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "plans"
              ? "bg-emerald-500 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/40"
              : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
          }`}
        >
          <Tag className="w-4 h-4" />
          الخطط
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "users"
              ? "bg-emerald-500 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/40"
              : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
          }`}
        >
          <Users className="w-4 h-4" />
          اشتراكات المستخدمين
        </button>
      </div>

      {/* ─── Sub-views ───────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === "plans" ? (
          <motion.div
            key="plans"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.2 }}
          >
            {/* ─── Plans Sub-view ──────────────────────────── */}
            <div className="space-y-5">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{plans.length}</p>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">إجمالي الخطط</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-green-700 dark:text-green-300">
                    {plans.filter((p) => p.isActive).length}
                  </p>
                  <p className="text-xs font-semibold text-green-600 dark:text-green-400 mt-1">نشطة</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-gray-700 dark:text-slate-300">
                    {plans.filter((p) => !p.isActive).length}
                  </p>
                  <p className="text-xs font-semibold text-gray-600 dark:text-slate-400 mt-1">معطّلة</p>
                </div>
              </div>

              {/* Add button */}
              <div className="flex justify-end">
                <Button
                  onClick={openAddPlan}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  إضافة خطة جديدة
                </Button>
              </div>

              {/* Plans Grid */}
              {plansLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : plans.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                  <Crown className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-slate-400 font-semibold">لا توجد خطط اشتراك</p>
                  <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">أضف خطة جديدة للبدء</p>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plans.map((plan, idx) => (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`relative bg-white dark:bg-slate-900 rounded-2xl border overflow-hidden transition-all hover:shadow-lg group ${
                        plan.isActive
                          ? "border-gray-200 dark:border-slate-800"
                          : "border-gray-200 dark:border-slate-800 opacity-60"
                      }`}
                    >
                      {/* Status strip */}
                      <div
                        className={`h-1.5 ${
                          plan.isActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-slate-700"
                        }`}
                      />

                      <div className="p-5">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                                plan.isActive
                                  ? "bg-emerald-50 dark:bg-emerald-900/30"
                                  : "bg-gray-100 dark:bg-slate-800"
                              }`}
                            >
                              <Crown
                                className={`w-5 h-5 ${
                                  plan.isActive
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-gray-400 dark:text-slate-500"
                                }`}
                              />
                            </div>
                            <div>
                              <h3 className="text-base font-black text-gray-900 dark:text-white">
                                {plan.name}
                              </h3>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  plan.isActive
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                    : "bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400"
                                }`}
                              >
                                {plan.isActive ? "نشط" : "معطّل"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-1 mb-3">
                          <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                            {plan.price?.toLocaleString()}
                          </span>
                          <span className="text-sm font-bold text-gray-500 dark:text-slate-400">ريال</span>
                        </div>

                        {/* Duration badge */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-bold">
                            <CalendarDays className="w-3 h-3" />
                            {durationLabel(plan.durationDays)}
                          </span>
                        </div>

                        {/* Description */}
                        {plan.description && (
                          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 line-clamp-2">
                            {plan.description}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-800">
                          <button
                            onClick={() => togglePlanActive(plan)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                          >
                            {plan.isActive ? (
                              <ToggleRight className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <ToggleLeft className="w-4 h-4" />
                            )}
                            {plan.isActive ? "تعطيل" : "تفعيل"}
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditPlan(plan)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-emerald-600 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteDialog(plan)}
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
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="users"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            {/* ─── User Subscriptions Sub-view ─────────────── */}
            <div className="space-y-5">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-gray-700 dark:text-slate-300">
                    {userSubs.length}
                  </p>
                  <p className="text-xs font-semibold text-gray-600 dark:text-slate-400 mt-1">
                    إجمالي الاشتراكات
                  </p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                    {activeSubsCount}
                  </p>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">نشطة</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-red-700 dark:text-red-300">
                    {expiredSubsCount}
                  </p>
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 mt-1">منتهية</p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="بحث بالاسم أو الخطة..."
                    value={subSearch}
                    onChange={(e) => setSubSearch(e.target.value)}
                    className="pr-9 rounded-xl"
                  />
                </div>
                <Select
                  value={subFilter}
                  onValueChange={(v) => setSubFilter(v as "all" | "active" | "expired")}
                >
                  <SelectTrigger className="w-full sm:w-44 rounded-xl">
                    <Filter className="w-4 h-4 ml-2 text-gray-400" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="expired">منتهي</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* User Subscriptions List */}
              {userSubsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredUserSubs.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                  <Users className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-slate-400 font-semibold">لا توجد اشتراكات</p>
                  <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                    ستظهر اشتراكات المستخدمين هنا
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-3 max-h-[calc(100vh-440px)] overflow-y-auto pr-1 scrollbar-thin">
                  {filteredUserSubs.map((sub, idx) => {
                    const isCurrentlyActive = sub.isActive && sub.expiresAt > Date.now();
                    const isExpiringSoon =
                      isCurrentlyActive && sub.expiresAt - Date.now() < 7 * 24 * 60 * 60 * 1000;

                    return (
                      <motion.div
                        key={`${sub.userId}-${sub.id}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className={`relative bg-white dark:bg-slate-900 rounded-2xl border overflow-hidden transition-all ${
                          isCurrentlyActive
                            ? "border-emerald-200 dark:border-emerald-800"
                            : "border-gray-200 dark:border-slate-800 opacity-70"
                        }`}
                      >
                        {/* Active indicator strip */}
                        <div
                          className={`absolute top-0 right-0 w-1.5 h-full ${
                            isCurrentlyActive
                              ? isExpiringSoon
                                ? "bg-amber-400"
                                : "bg-emerald-500"
                              : "bg-gray-300 dark:bg-slate-700"
                          }`}
                        />

                        <div className="p-4">
                          <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                            {/* Subscription Info */}
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Status Badge */}
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                    isCurrentlyActive
                                      ? isExpiringSoon
                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                  }`}
                                >
                                  {isCurrentlyActive ? (
                                    isExpiringSoon ? (
                                      <>
                                        <Clock className="w-3 h-3" />
                                        ينتهي قريباً
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="w-3 h-3" />
                                        نشط
                                      </>
                                    )
                                  ) : (
                                    <>
                                      <XCircle className="w-3 h-3" />
                                      منتهي
                                    </>
                                  )}
                                </span>
                                {sub.autoRenew && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300">
                                    <RefreshCw className="w-3 h-3" />
                                    تجديد تلقائي
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                                <div className="flex items-center gap-1.5 text-gray-600 dark:text-slate-400">
                                  <Users className="w-3.5 h-3.5" />
                                  <span className="truncate">
                                    {sub.userName || "غير معروف"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-600 dark:text-slate-400">
                                  <Crown className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="font-semibold truncate">
                                    {sub.planName || "—"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-500 text-xs">
                                  <CalendarDays className="w-3.5 h-3.5" />
                                  <span>تفعيل: {formatDate(sub.activatedAt)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-500 text-xs">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>انتهاء: {formatDate(sub.expiresAt)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Cancel button */}
                            {isCurrentlyActive && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCancelDialog(sub)}
                                className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 rounded-xl gap-1 flex-shrink-0"
                              >
                                <XCircle className="w-4 h-4" />
                                إلغاء
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Add/Edit Plan Dialog ─────────────────────────── */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <Crown className="w-5 h-5" />
              {editingPlan ? "تعديل خطة الاشتراك" : "إضافة خطة اشتراك جديدة"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
                اسم الخطة <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="مثال: الخطة الذهبية"
                value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
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
                  value={planForm.price}
                  onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
                  المدة (أيام) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  placeholder="30"
                  value={planForm.durationDays}
                  onChange={(e) => setPlanForm({ ...planForm, durationDays: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
                الوصف
              </label>
              <Textarea
                placeholder="وصف الخطة..."
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                className="rounded-xl min-h-[80px]"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
              <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                تفعيل الخطة
              </span>
              <Switch
                checked={planForm.isActive}
                onCheckedChange={(val) => setPlanForm({ ...planForm, isActive: val })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setPlanDialogOpen(false)}
              className="rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSavePlan}
              disabled={planSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1"
            >
              {planSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {editingPlan ? "حفظ التعديلات" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Plan Confirmation ─────────────────────── */}
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
              تأكيد حذف الخطة
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-slate-400 py-2">
            هل أنت متأكد من حذف خطة{" "}
            <span className="font-bold text-gray-900 dark:text-white">
              {deleteDialog?.name}
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
              onClick={handleDeletePlan}
              disabled={planSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl gap-1"
            >
              {planSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Cancel Subscription Confirmation ─────────────── */}
      <Dialog
        open={!!cancelDialog}
        onOpenChange={(open) => {
          if (!open) setCancelDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              إلغاء الاشتراك
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-slate-400 py-2">
            هل أنت متأكد من إلغاء اشتراك{" "}
            <span className="font-bold text-gray-900 dark:text-white">
              {cancelDialog?.userName}
            </span>{" "}
            في خطة{" "}
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {cancelDialog?.planName}
            </span>
            ؟
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCancelDialog(null)}
              className="rounded-xl"
            >
              تراجع
            </Button>
            <Button
              onClick={handleCancelSub}
              disabled={cancelSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl gap-1"
            >
              {cancelSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              تأكيد الإلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
