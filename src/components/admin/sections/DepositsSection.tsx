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
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  AlertCircle,
  User,
  Building2,
  DollarSign,
  Hash,
  CalendarDays,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ───────────────────────────────────────────────
interface DepositRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  bankId: string;
  bankName: string;
  amount: number;
  referenceNumber: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  rejectionReason?: string;
  processedAt?: number;
  processedBy?: string;
}

// ─── Component ───────────────────────────────────────────
export function DepositsSection() {
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectDialog, setRejectDialog] = useState<DepositRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  // ─── Load deposits ──────────────────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, "depositRequests"), (snap) => {
      const data = snap.val() || {};
      const list: DepositRequest[] = Object.entries(data).map(
        ([key, val]: [string, any]) => ({
          id: key,
          ...val,
        })
      );
      // Sort: pending first, then by date descending
      list.sort((a, b) => {
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (a.status !== "pending" && b.status === "pending") return 1;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
      setDeposits(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ─── Approve deposit ────────────────────────────────────
  const handleApprove = async (deposit: DepositRequest) => {
    setProcessing(deposit.id);
    try {
      // Update deposit status
      await update(ref(db, `depositRequests/${deposit.id}`), {
        status: "approved",
        processedAt: Date.now(),
        processedBy: auth.currentUser?.uid || "admin",
      });

      // Add balance atomically
      const userBalRef = ref(db, `users/${deposit.userId}/balance`);
      await runTransaction(userBalRef, (current) => {
        return (current || 0) + deposit.amount;
      });

      // Save to credit history
      const histRef = push(ref(db, `users/${deposit.userId}/creditHistory`));
      await set(histRef, {
        type: "deposit",
        amount: deposit.amount,
        description: `إيداع - ${deposit.bankName} - ${deposit.referenceNumber}`,
        date: Date.now(),
      });

      // Send notification
      const notifRef = push(
        ref(db, `users/${deposit.userId}/notifications`)
      );
      await set(notifRef, {
        type: "deposit_approved",
        title: "تم قبول الإيداع",
        message: `تم قبول إيداعك بمبلغ ${deposit.amount} ريال`,
        isRead: false,
        createdAt: Date.now(),
        relatedId: deposit.id,
      });

      // Log activity
      const actRef = push(ref(db, "activityLog"));
      await set(actRef, {
        action: "deposit_approved",
        user: auth.currentUser?.email || "admin",
        target: deposit.userName,
        details: `إيداع ${deposit.amount} ريال`,
        timestamp: Date.now(),
      });

      toast.success("تم قبول الإيداع بنجاح");
    } catch (err: any) {
      toast.error("حدث خطأ أثناء قبول الإيداع: " + err.message);
    } finally {
      setProcessing(null);
    }
  };

  // ─── Reject deposit ─────────────────────────────────────
  const handleReject = async () => {
    if (!rejectDialog || !rejectReason.trim()) {
      toast.error("يرجى إدخال سبب الرفض");
      return;
    }
    setProcessing(rejectDialog.id);
    try {
      await update(ref(db, `depositRequests/${rejectDialog.id}`), {
        status: "rejected",
        rejectionReason: rejectReason.trim(),
        processedAt: Date.now(),
        processedBy: auth.currentUser?.uid || "admin",
      });

      // Send notification
      const notifRef = push(
        ref(db, `users/${rejectDialog.userId}/notifications`)
      );
      await set(notifRef, {
        type: "deposit_rejected",
        title: "تم رفض الإيداع",
        message: `تم رفض إيداعك بمبلغ ${rejectDialog.amount} ريال. السبب: ${rejectReason}`,
        isRead: false,
        createdAt: Date.now(),
        relatedId: rejectDialog.id,
      });

      // Log activity
      const actRef = push(ref(db, "activityLog"));
      await set(actRef, {
        action: "deposit_rejected",
        user: auth.currentUser?.email || "admin",
        target: rejectDialog.userName,
        details: `رفض إيداع ${rejectDialog.amount} ريال`,
        timestamp: Date.now(),
      });

      toast.success("تم رفض الإيداع");
      setRejectDialog(null);
      setRejectReason("");
    } catch (err: any) {
      toast.error("حدث خطأ: " + err.message);
    } finally {
      setProcessing(null);
    }
  };

  // ─── Filter deposits ────────────────────────────────────
  const filteredDeposits = deposits.filter((d) => {
    const matchStatus =
      statusFilter === "all" || d.status === statusFilter;
    const matchSearch =
      !searchQuery ||
      d.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.bankName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const pendingCount = deposits.filter((d) => d.status === "pending").length;
  const approvedCount = deposits.filter((d) => d.status === "approved").length;
  const rejectedCount = deposits.filter((d) => d.status === "rejected").length;

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

  // ─── Status badge ───────────────────────────────────────
  const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { label: string; className: string }> = {
      pending: {
        label: "قيد الانتظار",
        className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      },
      approved: {
        label: "مقبول",
        className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
      },
      rejected: {
        label: "مرفوض",
        className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      },
    };
    const c = config[status] || config.pending;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${c.className}`}
      >
        {status === "pending" && <Clock className="w-3 h-3" />}
        {status === "approved" && <CheckCircle2 className="w-3 h-3" />}
        {status === "rejected" && <XCircle className="w-3 h-3" />}
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-7 h-7 text-emerald-600" />
            طلبات الإيداع
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            إدارة طلبات إيداع الرصيد
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm font-bold">
            <Clock className="w-4 h-4" />
            {pendingCount} قيد الانتظار
          </div>
        </div>
      </div>

      {/* ─── Stats ───────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 text-center"
        >
          <p className="text-2xl font-black text-amber-700 dark:text-amber-300">
            {pendingCount}
          </p>
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1">
            قيد الانتظار
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 text-center"
        >
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
            {approvedCount}
          </p>
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
            مقبول
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 text-center"
        >
          <p className="text-2xl font-black text-red-700 dark:text-red-300">
            {rejectedCount}
          </p>
          <p className="text-xs font-semibold text-red-600 dark:text-red-400 mt-1">
            مرفوض
          </p>
        </motion.div>
      </div>

      {/* ─── Filters ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="بحث بالاسم، البريد، رقم المرجع..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9 rounded-xl"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44 rounded-xl">
            <Filter className="w-4 h-4 ml-2 text-gray-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="pending">قيد الانتظار</SelectItem>
            <SelectItem value="approved">مقبول</SelectItem>
            <SelectItem value="rejected">مرفوض</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ─── Deposits List ───────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredDeposits.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <Receipt className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-slate-400 font-semibold">
            لا توجد طلبات إيداع
          </p>
          <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
            ستظهر طلبات الإيداع الجديدة هنا
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-380px)] overflow-y-auto pr-1 scrollbar-thin">
          {filteredDeposits.map((deposit, idx) => (
            <motion.div
              key={deposit.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={`
                relative bg-white dark:bg-slate-900 rounded-2xl border transition-all
                ${
                  deposit.status === "pending"
                    ? "border-amber-300 dark:border-amber-700 shadow-md shadow-amber-100 dark:shadow-amber-900/20 ring-1 ring-amber-200 dark:ring-amber-800"
                    : "border-gray-200 dark:border-slate-800"
                }
              `}
            >
              {/* Pending indicator strip */}
              {deposit.status === "pending" && (
                <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-400 rounded-r-2xl" />
              )}

              <div className="p-4">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                  {/* Deposit Info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={deposit.status} />
                      {deposit.status === "pending" && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                          ● جديد
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-slate-400">
                        <User className="w-3.5 h-3.5" />
                        <span className="truncate">
                          {deposit.userName || "غير معروف"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-500 text-xs">
                        <span className="truncate">{deposit.userEmail}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-slate-400">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{deposit.bankName || "—"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-slate-400">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {deposit.amount?.toLocaleString()} ريال
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-slate-400">
                        <Hash className="w-3.5 h-3.5" />
                        <span className="font-mono text-xs">
                          {deposit.referenceNumber || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-500 text-xs">
                        <CalendarDays className="w-3.5 h-3.5" />
                        <span>{formatDate(deposit.createdAt)}</span>
                      </div>
                    </div>

                    {deposit.rejectionReason && (
                      <div className="flex items-start gap-1.5 mt-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-xs text-red-600 dark:text-red-400">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>سبب الرفض: {deposit.rejectionReason}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {deposit.status === "pending" && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(deposit)}
                        disabled={processing === deposit.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {processing === deposit.id
                          ? "جاري القبول..."
                          : "قبول"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRejectDialog(deposit);
                          setRejectReason("");
                        }}
                        disabled={processing === deposit.id}
                        className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 rounded-xl gap-1"
                      >
                        <XCircle className="w-4 h-4" />
                        رفض
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ─── Reject Dialog ───────────────────────────────── */}
      <Dialog
        open={!!rejectDialog}
        onOpenChange={(open) => {
          if (!open) setRejectDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              رفض طلب الإيداع
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {rejectDialog && (
              <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl text-sm space-y-1">
                <p>
                  <span className="font-semibold">المستخدم:</span>{" "}
                  {rejectDialog.userName}
                </p>
                <p>
                  <span className="font-semibold">المبلغ:</span>{" "}
                  {rejectDialog.amount?.toLocaleString()} ريال
                </p>
                <p>
                  <span className="font-semibold">البنك:</span>{" "}
                  {rejectDialog.bankName}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
                سبب الرفض <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="أدخل سبب رفض الإيداع..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="rounded-xl min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectDialog(null)}
              className="rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleReject}
              disabled={!rejectReason.trim() || !!processing}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl gap-1"
            >
              <XCircle className="w-4 h-4" />
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
