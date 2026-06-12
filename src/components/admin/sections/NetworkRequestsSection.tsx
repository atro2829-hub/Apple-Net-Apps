"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import { ref, set, get, push, update, remove, onValue } from "firebase/database";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FileCheck, CheckCircle, XCircle, Clock, User, MapPin,
  Wifi, MessageSquare, Search, Eye, ChevronDown
} from "lucide-react";

interface NetworkSubmission {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  networkName: string;
  networkType: string;
  location: string;
  province: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: number;
  rejectReason: string;
}

export function NetworkRequestsSection() {
  const [submissions, setSubmissions] = useState<NetworkSubmission[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<NetworkSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onValue(ref(db, "networkSubmissions"), (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([id, v]: [string, any]) => ({ id, ...v }));
      list.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
      setSubmissions(list);
    });
    return () => unsub();
  }, []);

  const filtered = submissions.filter(s => {
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return s.networkName?.toLowerCase().includes(q) ||
        s.userName?.toLowerCase().includes(q) ||
        s.location?.toLowerCase().includes(q);
    }
    return true;
  });

  const pendingCount = submissions.filter(s => s.status === "pending").length;

  const handleApprove = async (sub: NetworkSubmission) => {
    setProcessing(sub.id);
    try {
      // Create new network in networks/
      const networkRef = push(ref(db, "networks"));
      await set(networkRef, {
        name: sub.networkName,
        type: sub.networkType || "card_selling",
        location: sub.location,
        province: sub.province,
        description: sub.description,
        managerId: sub.userId,
        managerName: sub.userName,
        active: true,
        createdAt: Date.now(),
      });

      // Update user role to network_manager
      await update(ref(db, `users/${sub.userId}`), {
        role: "network_manager",
        managedNetwork: networkRef.key,
      });

      // Update submission status
      await update(ref(db, `networkSubmissions/${sub.id}`), {
        status: "approved",
        approvedAt: Date.now(),
      });

      toast.success("تم قبول الشبكة وإنشائها بنجاح");
      setSelectedSubmission(null);
    } catch (err) {
      toast.error("حدث خطأ أثناء المعالجة");
    }
    setProcessing(null);
  };

  const handleReject = async (sub: NetworkSubmission) => {
    if (!rejectReason.trim()) { toast.error("سبب الرفض مطلوب"); return; }
    setProcessing(sub.id);
    try {
      await update(ref(db, `networkSubmissions/${sub.id}`), {
        status: "rejected",
        rejectReason: rejectReason,
        rejectedAt: Date.now(),
      });
      toast.success("تم رفض الطلب");
      setSelectedSubmission(null);
      setRejectReason("");
    } catch { toast.error("حدث خطأ"); }
    setProcessing(null);
  };

  const formatDate = (ts: number) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("ar-YE", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: "قيد الانتظار", color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" },
    approved: { label: "مقبول", color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" },
    rejected: { label: "مرفوض", color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">طلبات الشبكات</h2>
            <p className="text-sm text-gray-500">مراجعة طلبات إنشاء شبكات جديدة</p>
          </div>
        </div>
        {pendingCount > 0 && (
          <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-semibold animate-pulse">
            {pendingCount} طلب معلق
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="بحث..." className="pr-9" />
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
          {[
            { id: "all", label: "الكل" },
            { id: "pending", label: "معلق" },
            { id: "approved", label: "مقبول" },
            { id: "rejected", label: "مرفوض" },
          ].map(f => (
            <button key={f.id} onClick={() => setFilterStatus(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterStatus === f.id ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-gray-500"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submissions List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>لا توجد طلبات</p>
        </div>
      ) : (
        <div className="max-h-[600px] overflow-y-auto space-y-3">
          {filtered.map((sub) => {
            const status = statusLabels[sub.status] || statusLabels.pending;
            return (
              <motion.div key={sub.id} layout className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <Wifi className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-900 dark:text-white">{sub.networkName}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.color}`}>{status.label}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {sub.userName || sub.userId}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {sub.location} {sub.province && `• ${sub.province}`}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(sub.submittedAt)}</span>
                      </div>
                      {sub.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{sub.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {sub.status === "pending" && (
                      <>
                        <button onClick={() => { setSelectedSubmission(sub); setRejectReason(""); }}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500"><Eye className="w-4 h-4" /></button>
                      </>
                    )}
                    {sub.status === "rejected" && sub.rejectReason && (
                      <span className="text-xs text-red-500 mt-1">السبب: {sub.rejectReason}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail/Action Modal */}
      <AnimatePresence>
        {selectedSubmission && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedSubmission(null)}
          >
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">مراجعة طلب الشبكة</h3>
                <button onClick={() => setSelectedSubmission(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                  <XCircle className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                <InfoRow label="اسم الشبكة" value={selectedSubmission.networkName} />
                <InfoRow label="نوع الشبكة" value={selectedSubmission.networkType} />
                <InfoRow label="المستخدم" value={selectedSubmission.userName || selectedSubmission.userId} />
                <InfoRow label="الهاتف" value={selectedSubmission.userPhone} />
                <InfoRow label="الموقع" value={`${selectedSubmission.location} ${selectedSubmission.province ? `• ${selectedSubmission.province}` : ""}`} />
                {selectedSubmission.description && <InfoRow label="الوصف" value={selectedSubmission.description} />}
                <InfoRow label="تاريخ التقديم" value={formatDate(selectedSubmission.submittedAt)} />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">سبب الرفض (في حالة الرفض)</label>
                <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="أدخل سبب الرفض..." rows={2} />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleApprove(selectedSubmission)}
                  disabled={processing === selectedSubmission.id}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 ml-1" /> قبول وإنشاء الشبكة
                </Button>
                <Button
                  onClick={() => handleReject(selectedSubmission)}
                  disabled={processing === selectedSubmission.id || !rejectReason.trim()}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 ml-1" /> رفض
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[80px]">{label}:</span>
      <span className="text-sm text-gray-900 dark:text-white">{value || "—"}</span>
    </div>
  );
}
