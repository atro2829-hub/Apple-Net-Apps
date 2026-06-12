"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import { ref, set, get, push, update, remove, onValue } from "firebase/database";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bell,
  Send,
  Search,
  Loader2,
  Plus,
  Users,
  Clock,
  Tag,
  Megaphone,
  CheckCircle2,
  Gift,
  DollarSign,
  CreditCard,
  Crown,
  FileText,
  AlertCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ───────────────────────────────────────────────
interface BulkNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  targetCount: number;
  sentAt: number;
  sentBy: string;
}

// ─── Notification type config ────────────────────────────
const NOTIF_TYPES: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  general: {
    label: "عام",
    icon: <Megaphone className="w-3.5 h-3.5" />,
    color: "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300",
  },
  deposit_approved: {
    label: "قبول إيداع",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  deposit_rejected: {
    label: "رفض إيداع",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
  gift_received: {
    label: "هدية مستلمة",
    icon: <Gift className="w-3.5 h-3.5" />,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
  new_deposit_request: {
    label: "طلب إيداع جديد",
    icon: <CreditCard className="w-3.5 h-3.5" />,
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  subscription: {
    label: "اشتراك",
    icon: <Crown className="w-3.5 h-3.5" />,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
};

// ─── Component ───────────────────────────────────────────
export function NotificationsSection() {
  // ─── Form State ────────────────────────────────────────
  const [formTitle, setFormTitle] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formType, setFormType] = useState("general");
  const [sending, setSending] = useState(false);

  // ─── History State ─────────────────────────────────────
  const [history, setHistory] = useState<BulkNotification[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // ─── Load History ──────────────────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, "bulkNotifications"), (snap) => {
      const data = snap.val() || {};
      const list: BulkNotification[] = Object.entries(data)
        .map(([key, val]: [string, any]) => ({
          id: key,
          ...val,
        }))
        .sort((a, b) => (b.sentAt || 0) - (a.sentAt || 0));
      setHistory(list);
      setHistoryLoading(false);
    });
    return () => unsub();
  }, []);

  // ─── Send Bulk Notification ────────────────────────────
  const handleSend = async () => {
    if (!formTitle.trim()) {
      toast.error("يرجى إدخال عنوان الإشعار");
      return;
    }
    if (!formMessage.trim()) {
      toast.error("يرجى إدخال نص الإشعار");
      return;
    }

    setSending(true);
    try {
      // Get all users
      const usersSnap = await get(ref(db, "users"));
      const usersData = usersSnap.val() || {};
      const userIds = Object.keys(usersData);
      const targetCount = userIds.length;

      if (targetCount === 0) {
        toast.error("لا يوجد مستخدمون لإرسال الإشعار");
        setSending(false);
        return;
      }

      // Push notification to each user's notifications
      const notifPromises = userIds.map((uid) => {
        const notifRef = push(ref(db, `notifications/${uid}`));
        return set(notifRef, {
          type: formType,
          title: formTitle.trim(),
          message: formMessage.trim(),
          isRead: false,
          createdAt: Date.now(),
        });
      });

      await Promise.all(notifPromises);

      // Push to bulkNotifications for history
      const bulkRef = push(ref(db, "bulkNotifications"));
      await set(bulkRef, {
        title: formTitle.trim(),
        message: formMessage.trim(),
        type: formType,
        targetCount,
        sentAt: Date.now(),
        sentBy: auth.currentUser?.email || "admin",
      });

      // Log activity
      const actRef = push(ref(db, "activityLog"));
      await set(actRef, {
        action: "bulk_notification_sent",
        user: auth.currentUser?.email || "admin",
        target: "جميع المستخدمين",
        details: `${formTitle.trim()} → ${targetCount} مستخدم`,
        timestamp: Date.now(),
      });

      toast.success(`تم إرسال الإشعار إلى ${targetCount} مستخدم بنجاح`);

      // Reset form
      setFormTitle("");
      setFormMessage("");
      setFormType("general");
    } catch (err: any) {
      toast.error("حدث خطأ أثناء الإرسال: " + err.message);
    } finally {
      setSending(false);
    }
  };

  // ─── Filter history ────────────────────────────────────
  const filteredHistory = history.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.message?.toLowerCase().includes(q) ||
      item.sentBy?.toLowerCase().includes(q) ||
      NOTIF_TYPES[item.type]?.label?.includes(q)
    );
  });

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

  // ─── Type badge ─────────────────────────────────────────
  const TypeBadge = ({ type }: { type: string }) => {
    const config = NOTIF_TYPES[type] || NOTIF_TYPES.general;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${config.color}`}
      >
        {config.icon}
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="w-7 h-7 text-emerald-600" />
            الإشعارات
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            إرسال إشعارات جماعية وعرض السجل
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm font-bold">
            <Send className="w-4 h-4" />
            {history.length} إشعار مُرسل
          </div>
        </div>
      </div>

      {/* ─── Send Notification Form ──────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6"
      >
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-black text-gray-900 dark:text-white">
              إرسال إشعار جماعي
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              سيتم إرسال الإشعار لجميع المستخدمين
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
              عنوان الإشعار <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="أدخل عنوان الإشعار..."
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
              نص الإشعار <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="أدخل نص الإشعار..."
              value={formMessage}
              onChange={(e) => setFormMessage(e.target.value)}
              className="rounded-xl min-h-[100px]"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
              نوع الإشعار
            </label>
            <Select value={formType} onValueChange={setFormType}>
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">
                  <span className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4" />
                    عام
                  </span>
                </SelectItem>
                <SelectItem value="deposit_approved">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    قبول إيداع
                  </span>
                </SelectItem>
                <SelectItem value="deposit_rejected">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    رفض إيداع
                  </span>
                </SelectItem>
                <SelectItem value="gift_received">
                  <span className="flex items-center gap-2">
                    <Gift className="w-4 h-4" />
                    هدية مستلمة
                  </span>
                </SelectItem>
                <SelectItem value="new_deposit_request">
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    طلب إيداع جديد
                  </span>
                </SelectItem>
                <SelectItem value="subscription">
                  <span className="flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    اشتراك
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type preview */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
            <span className="text-xs text-gray-500 dark:text-slate-400">معاينة النوع:</span>
            <TypeBadge type={formType} />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSend}
              disabled={sending || !formTitle.trim() || !formMessage.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 px-6"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  إرسال الإشعار
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ─── Notification History ────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            سجل الإشعارات
          </h3>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="بحث في السجل بالعنوان، النص، المُرسل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9 rounded-xl"
          />
        </div>

        {/* History List */}
        {historyLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredHistory.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Bell className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-slate-400 font-semibold">
              {searchQuery ? "لا توجد نتائج للبحث" : "لا توجد إشعارات مُرسلة"}
            </p>
            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
              {searchQuery
                ? "جرّب البحث بكلمات مختلفة"
                : "أرسل إشعارك الأول من النموذج أعلاه"}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHistory.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden hover:shadow-lg transition-all group"
              >
                {/* Type-colored top strip */}
                <div
                  className={`h-1 ${
                    item.type === "deposit_approved"
                      ? "bg-emerald-500"
                      : item.type === "deposit_rejected"
                      ? "bg-red-500"
                      : item.type === "gift_received"
                      ? "bg-purple-500"
                      : item.type === "new_deposit_request"
                      ? "bg-amber-500"
                      : item.type === "subscription"
                      ? "bg-blue-500"
                      : "bg-gray-400"
                  }`}
                />

                <div className="p-5">
                  {/* Header: Type badge + Date */}
                  <div className="flex items-start justify-between mb-3">
                    <TypeBadge type={item.type} />
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(item.sentAt)}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-sm font-black text-gray-900 dark:text-white mb-1.5 line-clamp-1">
                    {item.title}
                  </h4>

                  {/* Message */}
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-3 line-clamp-2 leading-relaxed">
                    {item.message}
                  </p>

                  {/* Footer: Target count + Sent by */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <Users className="w-3.5 h-3.5" />
                      {item.targetCount?.toLocaleString()} مستخدم
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-slate-500">
                      <FileText className="w-3 h-3" />
                      {item.sentBy || "مسؤول"}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
