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
  Wallet,
  Search,
  Plus,
  Minus,
  ArrowUpCircle,
  ArrowDownCircle,
  User,
  Phone,
  Mail,
  History,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ───────────────────────────────────────────────
interface UserInfo {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  balance: number;
  role: string;
  isActive: boolean;
  createdAt: number;
}

interface CreditEntry {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: number;
}

// ─── Component ───────────────────────────────────────────
export function BalancesSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [creditHistory, setCreditHistory] = useState<CreditEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [balanceForm, setBalanceForm] = useState({
    amount: "",
    description: "",
  });
  const [balanceType, setBalanceType] = useState<"credit" | "debit">("credit");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [allUsers, setAllUsers] = useState<UserInfo[]>([]);

  // ─── Load all users for search ─────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, "users"), (snap) => {
      const data = snap.val() || {};
      const list: UserInfo[] = Object.entries(data).map(
        ([key, val]: [string, any]) => ({
          uid: key,
          ...val,
        })
      );
      setAllUsers(list);
    });
    return () => unsub();
  }, []);

  // ─── Search users ──────────────────────────────────────
  const filteredUsers = searchQuery
    ? allUsers.filter((u) => {
        const q = searchQuery.toLowerCase();
        return (
          u.displayName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q)
        );
      })
    : [];

  // ─── Select user ───────────────────────────────────────
  const selectUser = async (user: UserInfo) => {
    setSelectedUser(user);
    setSearchQuery(user.displayName || user.email);
    setLoadingHistory(true);

    try {
      const histSnap = await get(ref(db, `users/${user.uid}/creditHistory`));
      const histData = histSnap.val() || {};
      const histList: CreditEntry[] = Object.entries(histData)
        .map(([key, val]: [string, any]) => ({
          id: key,
          ...val,
        }))
        .sort((a, b) => (b.date || 0) - (a.date || 0));
      setCreditHistory(histList);
    } catch {
      setCreditHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // ─── Submit balance change ─────────────────────────────
  const handleSubmitBalance = async () => {
    if (!selectedUser || !balanceForm.amount || Number(balanceForm.amount) <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    const amount = Number(balanceForm.amount);
    setSubmitting(true);

    try {
      if (balanceType === "credit") {
        const balRef = ref(db, `users/${selectedUser.uid}/balance`);
        await runTransaction(balRef, (current) => {
          return (current || 0) + amount;
        });

        const histRef = push(
          ref(db, `users/${selectedUser.uid}/creditHistory`)
        );
        await set(histRef, {
          type: "deposit",
          amount,
          description:
            balanceForm.description || `إيداع يدوي من الإدارة`,
          date: Date.now(),
        });

        const notifRef = push(
          ref(db, `users/${selectedUser.uid}/notifications`)
        );
        await set(notifRef, {
          type: "general",
          title: "إيداع رصيد",
          message: `تم إيداع ${amount.toLocaleString()} ريال في حسابك`,
          isRead: false,
          createdAt: Date.now(),
        });
      } else {
        const balSnap = await get(ref(db, `users/${selectedUser.uid}/balance`));
        const currentBalance = balSnap.val() || 0;
        if (currentBalance < amount) {
          toast.error("الرصيد غير كافٍ للسحب");
          setSubmitting(false);
          return;
        }

        const balRef = ref(db, `users/${selectedUser.uid}/balance`);
        await runTransaction(balRef, (current) => {
          return Math.max((current || 0) - amount, 0);
        });

        const histRef = push(
          ref(db, `users/${selectedUser.uid}/creditHistory`)
        );
        await set(histRef, {
          type: "purchase",
          amount: -amount,
          description:
            balanceForm.description || `سحب يدوي من الإدارة`,
          date: Date.now(),
        });

        const notifRef = push(
          ref(db, `users/${selectedUser.uid}/notifications`)
        );
        await set(notifRef, {
          type: "general",
          title: "سحب رصيد",
          message: `تم سحب ${amount.toLocaleString()} ريال من حسابك`,
          isRead: false,
          createdAt: Date.now(),
        });
      }

      // Log activity
      const actRef = push(ref(db, "activityLog"));
      await set(actRef, {
        action: balanceType === "credit" ? "balance_credit" : "balance_debit",
        user: auth.currentUser?.email || "admin",
        target: selectedUser.displayName || selectedUser.email,
        details: `${balanceType === "credit" ? "إيداع" : "سحب"} ${amount} ريال`,
        timestamp: Date.now(),
      });

      toast.success(
        balanceType === "credit"
          ? `تم إيداع ${amount.toLocaleString()} ريال بنجاح`
          : `تم سحب ${amount.toLocaleString()} ريال بنجاح`
      );

      // Refresh user data
      const userSnap = await get(ref(db, `users/${selectedUser.uid}`));
      if (userSnap.exists()) {
        setSelectedUser({ uid: selectedUser.uid, ...userSnap.val() });
      }

      // Refresh history
      const histSnap = await get(
        ref(db, `users/${selectedUser.uid}/creditHistory`)
      );
      const histData = histSnap.val() || {};
      const histList: CreditEntry[] = Object.entries(histData)
        .map(([key, val]: [string, any]) => ({ id: key, ...val }))
        .sort((a, b) => (b.date || 0) - (a.date || 0));
      setCreditHistory(histList);

      setDialogOpen(false);
      setBalanceForm({ amount: "", description: "" });
    } catch (err: any) {
      toast.error("حدث خطأ: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

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

  const CreditTypeBadge = ({ type, amount }: { type: string; amount: number }) => {
    const isPositive = amount > 0;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
          isPositive
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
        }`}
      >
        {isPositive ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )}
        {isPositive ? "+" : ""}
        {amount?.toLocaleString()} ريال
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-7 h-7 text-emerald-600" />
            إدارة الأرصدة
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            إيداع وسحب أرصدة المستخدمين
          </p>
        </div>
      </div>

      {/* ─── Search ──────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          placeholder="ابحث بالاسم أو البريد أو رقم الهاتف..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10 h-12 rounded-xl text-base"
        />
      </div>

      {/* ─── Search Results ──────────────────────────────── */}
      {searchQuery && filteredUsers.length > 0 && !selectedUser && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="p-3 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
            <p className="text-sm font-semibold text-gray-600 dark:text-slate-400">
              نتائج البحث ({filteredUsers.length})
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
            {filteredUsers.slice(0, 10).map((user) => (
              <button
                key={user.uid}
                onClick={() => selectUser(user)}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                  {(user.displayName || user.email || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {user.displayName || "بدون اسم"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                    {user.email}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {(user.balance || 0).toLocaleString()} ريال
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {searchQuery && filteredUsers.length === 0 && !selectedUser && (
        <div className="text-center py-10">
          <User className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-slate-400 font-semibold">
            لم يتم العثور على مستخدم
          </p>
        </div>
      )}

      {/* ─── Selected User Card ──────────────────────────── */}
      {selectedUser && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden"
        >
          {/* User Header */}
          <div className="p-5 bg-gradient-to-l from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-900 border-b border-gray-200 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/30">
                {(selectedUser.displayName || selectedUser.email || "?")
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  {selectedUser.displayName || "بدون اسم"}
                </h3>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {selectedUser.email}
                  </span>
                  {selectedUser.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {selectedUser.phone}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  الرصيد الحالي
                </p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {(selectedUser.balance || 0).toLocaleString()}
                  <span className="text-sm mr-1">ريال</span>
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 flex flex-wrap gap-3 border-b border-gray-200 dark:border-slate-800">
            <Button
              onClick={() => {
                setBalanceType("credit");
                setBalanceForm({ amount: "", description: "" });
                setDialogOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5"
            >
              <ArrowUpCircle className="w-4 h-4" />
              إيداع رصيد
            </Button>
            <Button
              onClick={() => {
                setBalanceType("debit");
                setBalanceForm({ amount: "", description: "" });
                setDialogOpen(true);
              }}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 rounded-xl gap-1.5"
            >
              <ArrowDownCircle className="w-4 h-4" />
              سحب رصيد
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedUser(null);
                setSearchQuery("");
              }}
              className="rounded-xl"
            >
              رجوع
            </Button>
          </div>

          {/* Credit History */}
          <div className="p-4">
            <h4 className="text-sm font-bold text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <History className="w-4 h-4" />
              سجل العمليات
            </h4>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
              </div>
            ) : creditHistory.length === 0 ? (
              <p className="text-center text-gray-400 dark:text-slate-500 text-sm py-8">
                لا توجد عمليات سابقة
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
                {creditHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          entry.amount > 0
                            ? "bg-emerald-100 dark:bg-emerald-900/30"
                            : "bg-red-100 dark:bg-red-900/30"
                        }`}
                      >
                        {entry.amount > 0 ? (
                          <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Minus className="w-4 h-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {entry.description}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">
                          {formatDate(entry.date)}
                        </p>
                      </div>
                    </div>
                    <CreditTypeBadge type={entry.type} amount={entry.amount} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ─── Empty State ─────────────────────────────────── */}
      {!searchQuery && !selectedUser && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <Wallet className="w-20 h-20 text-gray-200 dark:text-slate-700 mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-500 dark:text-slate-400">
            ابحث عن مستخدم لإدارة رصيده
          </p>
          <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
            أدخل الاسم أو البريد الإلكتروني أو رقم الهاتف
          </p>
        </motion.div>
      )}

      {/* ─── Balance Dialog ──────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle
              className={`flex items-center gap-2 ${
                balanceType === "credit"
                  ? "text-emerald-600"
                  : "text-red-600"
              }`}
            >
              {balanceType === "credit" ? (
                <ArrowUpCircle className="w-5 h-5" />
              ) : (
                <ArrowDownCircle className="w-5 h-5" />
              )}
              {balanceType === "credit" ? "إيداع رصيد" : "سحب رصيد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedUser && (
              <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl text-sm">
                <p>
                  <span className="font-semibold">المستخدم:</span>{" "}
                  {selectedUser.displayName || selectedUser.email}
                </p>
                <p>
                  <span className="font-semibold">الرصيد الحالي:</span>{" "}
                  <span className="font-bold text-emerald-600">
                    {(selectedUser.balance || 0).toLocaleString()} ريال
                  </span>
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
                المبلغ (ريال) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                placeholder="أدخل المبلغ"
                value={balanceForm.amount}
                onChange={(e) =>
                  setBalanceForm({ ...balanceForm, amount: e.target.value })
                }
                className="rounded-xl"
                min="1"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
                الوصف
              </label>
              <Textarea
                placeholder="أدخل وصف العملية..."
                value={balanceForm.description}
                onChange={(e) =>
                  setBalanceForm({ ...balanceForm, description: e.target.value })
                }
                className="rounded-xl min-h-[80px]"
              />
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
              onClick={handleSubmitBalance}
              disabled={
                submitting || !balanceForm.amount || Number(balanceForm.amount) <= 0
              }
              className={`rounded-xl gap-1 text-white ${
                balanceType === "credit"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : balanceType === "credit" ? (
                <ArrowUpCircle className="w-4 h-4" />
              ) : (
                <ArrowDownCircle className="w-4 h-4" />
              )}
              {balanceType === "credit" ? "تأكيد الإيداع" : "تأكيد السحب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
