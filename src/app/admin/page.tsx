"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { ref, get, onValue } from "firebase/database";
import { AdminPanel } from "@/components/AdminPanel";
import { NetworkManagerPanel } from "@/components/NetworkManagerPanel";
import { AdminAuthForm } from "@/components/AdminAuthForm";
import { AppleNetLogo } from "@/components/AppleNetLogo";
import { Shield, Lock, Loader2, Bell, BellRing, X, LogOut } from "lucide-react";
import { initFCMToken, showLocalNotification } from "@/lib/notifications";
import type { DepositRequest, StarlinkOrder, NetworkSubmission } from "@/lib/types";

type AuthState = "loading" | "unauthenticated" | "not_admin" | "admin" | "network_manager";

interface AdminNotification {
  id: string;
  type: "deposit" | "starlink_order" | "network_submission" | "general";
  title: string;
  message: string;
  createdAt: number;
  isRead: boolean;
}

export default function AdminPage() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [managedNetwork, setManagedNetwork] = useState<string>("");
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const previousDepositCount = useRef<number>(0);
  const previousOrderCount = useRef<number>(0);
  const previousSubmissionCount = useRef<number>(0);

  // ─── Auth State Listener ─────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setFirebaseUser(null);
        setAuthState("unauthenticated");
        setUserRole("");
        setManagedNetwork("");
        return;
      }

      setFirebaseUser(user);

      try {
        const roleSnapshot = await get(ref(db, `users/${user.uid}/role`));
        const role = roleSnapshot.val();

        if (role === "admin") {
          setAuthState("admin");
          setUserRole("admin");
        } else if (role === "network_manager") {
          setAuthState("network_manager");
          setUserRole("network_manager");
          const netSnapshot = await get(ref(db, `users/${user.uid}/managedNetwork`));
          setManagedNetwork(netSnapshot.val() || "");
        } else {
          setAuthState("not_admin");
          setUserRole(role || "user");
        }

        // Initialize FCM for push notifications
        initFCMToken(user.uid).catch(() => {});
      } catch {
        setAuthState("not_admin");
      }
    });

    return () => unsubscribe();
  }, []);

  // ─── Real-time Notification Listeners ─────────────────────
  useEffect(() => {
    if (authState !== "admin" && authState !== "network_manager") return;

    const unsubs: (() => void)[] = [];

    // Listen for new deposit requests
    const depositUnsub = onValue(ref(db, "depositRequests"), (snap) => {
      const data = snap.val() || {};
      const deposits = Object.values(data) as DepositRequest[];
      const pendingCount = deposits.filter(d => d.status === "pending").length;

      if (previousDepositCount.current > 0 && pendingCount > previousDepositCount.current) {
        const newCount = pendingCount - previousDepositCount.current;
        showLocalNotification({
          title: "طلب إيداع جديد",
          body: `لديك ${newCount} طلب إيداع جديد بانتظار المراجعة`,
          tag: "new-deposit",
        });
        setNotifications(prev => ([{
          id: `dep-${Date.now()}`,
          type: "deposit",
          title: "طلب إيداع جديد",
          message: `لديك ${newCount} طلب إيداع جديد بانتظار المراجعة`,
          createdAt: Date.now(),
          isRead: false,
        }, ...prev].slice(0, 50)));
      }
      previousDepositCount.current = pendingCount;
    });
    unsubs.push(depositUnsub);

    // Listen for new Starlink orders
    const orderUnsub = onValue(ref(db, "starlinkOrders"), (snap) => {
      const data = snap.val() || {};
      const orders = Object.values(data) as StarlinkOrder[];
      const pendingCount = orders.filter(o => o.status === "pending").length;

      if (previousOrderCount.current > 0 && pendingCount > previousOrderCount.current) {
        const newCount = pendingCount - previousOrderCount.current;
        showLocalNotification({
          title: "طلب Starlink جديد",
          body: `لديك ${newCount} طلب Starlink جديد`,
          tag: "new-starlink-order",
        });
        setNotifications(prev => ([{
          id: `star-${Date.now()}`,
          type: "starlink_order",
          title: "طلب Starlink جديد",
          message: `لديك ${newCount} طلب Starlink جديد`,
          createdAt: Date.now(),
          isRead: false,
        }, ...prev].slice(0, 50)));
      }
      previousOrderCount.current = pendingCount;
    });
    unsubs.push(orderUnsub);

    // Listen for new network submissions
    const subUnsub = onValue(ref(db, "networkSubmissions"), (snap) => {
      const data = snap.val() || {};
      const subs = Object.values(data) as NetworkSubmission[];
      const pendingCount = subs.filter(s => s.status === "pending").length;

      if (previousSubmissionCount.current > 0 && pendingCount > previousSubmissionCount.current) {
        const newCount = pendingCount - previousSubmissionCount.current;
        showLocalNotification({
          title: "طلب تقديم شبكة جديد",
          body: `لديك ${newCount} طلب شبكة جديد بانتظار المراجعة`,
          tag: "new-network-submission",
        });
        setNotifications(prev => ([{
          id: `net-${Date.now()}`,
          type: "network_submission",
          title: "طلب تقديم شبكة جديد",
          message: `لديك ${newCount} طلب شبكة جديد بانتظار المراجعة`,
          createdAt: Date.now(),
          isRead: false,
        }, ...prev].slice(0, 50)));
      }
      previousSubmissionCount.current = pendingCount;
    });
    unsubs.push(subUnsub);

    return () => unsubs.forEach(u => u());
  }, [authState]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  // ─── Loading State ───────────────────────────────────────
  if (authState === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1B7A3D] to-[#134D28] flex flex-col items-center justify-center" dir="rtl">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-24 h-24 rounded-3xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <Loader2 className="w-12 h-12 text-white animate-spin" />
          </div>
          <div className="text-center">
            <AppleNetLogo size="lg" />
            <p className="text-white/70 text-sm mt-3 font-medium">
              جاري التحقق من الصلاحيات...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Admin Panel ─────────────────────────────────────────
  if (authState === "admin" && firebaseUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900" dir="rtl">
        {/* Admin Notification Bar */}
        {unreadCount > 0 && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-[#1B7A3D] text-white px-4 py-2 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 animate-pulse" />
              <span className="text-sm font-bold">{unreadCount} إشعار جديد</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNotifPanel(true)}
                className="text-xs bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1 transition-colors"
              >
                عرض
              </button>
              <button
                onClick={markAllRead}
                className="text-xs bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1 transition-colors"
              >
                تحديد الكل كمقروء
              </button>
            </div>
          </div>
        )}

        {/* Notification Panel Overlay */}
        <AnimatePresence>
          {showNotifPanel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowNotifPanel(false)}
            >
              <motion.div
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute left-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-slate-800 shadow-2xl overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-[#1B7A3D]" />
                    <h3 className="font-bold text-gray-900 dark:text-white">الإشعارات</h3>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{unreadCount}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={markAllRead} className="text-xs text-[#1B7A3D] hover:underline">
                      تحديد الكل كمقروء
                    </button>
                    <button onClick={() => setShowNotifPanel(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {notifications.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">لا توجد إشعارات</p>
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div
                        key={notif.id}
                        className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                          notif.isRead
                            ? "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700"
                            : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                        }`}
                        onClick={() => {
                          setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            notif.isRead ? "bg-gray-300" : "bg-[#1B7A3D]"
                          }`} />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{notif.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{notif.message}</p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {new Date(notif.createdAt).toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AdminPanel onClose={() => {}} />

        {/* Fixed notification bell for admin panel */}
        <button
          onClick={() => setShowNotifPanel(true)}
          className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full bg-[#1B7A3D] text-white shadow-xl flex items-center justify-center hover:bg-[#166833] transition-colors"
        >
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  // ─── Network Manager Panel ───────────────────────────────
  if (authState === "network_manager" && firebaseUser && managedNetwork) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900" dir="rtl">
        <NetworkManagerPanel onClose={() => {}} managedNetwork={managedNetwork} />
      </div>
    );
  }

  // ─── Not Admin (Logged in but no permission) ─────────────
  if (authState === "not_admin") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1B7A3D] to-[#134D28] flex flex-col items-center justify-center p-6" dir="rtl">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-full max-w-sm flex flex-col items-center"
        >
          <div className="w-24 h-24 rounded-3xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 mb-6">
            <Lock className="w-12 h-12 text-white" />
          </div>
          <AppleNetLogo size="md" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 w-full"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
              <Shield className="w-8 h-8 text-white/80 mx-auto mb-3" />
              <h2 className="text-white text-xl font-black mb-2">غير مصرح بالوصول</h2>
              <p className="text-white/60 text-sm leading-relaxed">
                ليس لديك صلاحيات إدارية للوصول إلى لوحة التحكم. يرجى تسجيل الدخول بحساب مسؤول أو مدير شبكة.
              </p>
              <p className="text-white/40 text-xs mt-2">الرتبة الحالية: {userRole || "مستخدم"}</p>
            </div>
            <button
              onClick={async () => {
                const { signOut } = await import("firebase/auth");
                await signOut(auth);
              }}
              className="w-full mt-4 bg-white/15 hover:bg-white/25 text-white font-bold rounded-2xl h-12 transition-colors border border-white/20 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ─── Unauthenticated — Show Login Screen ─────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1B7A3D] to-[#134D28] flex flex-col" dir="rtl">
      <div className="flex-shrink-0 pt-12 pb-6 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <AppleNetLogo size="lg" />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/20"
          >
            <Lock className="w-3.5 h-3.5 text-white/70" />
            <span className="text-white/80 text-xs font-bold">لوحة الإدارة</span>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="flex-1 bg-white dark:bg-slate-900 rounded-t-[2rem] shadow-2xl overflow-hidden"
      >
        <div className="p-6 pt-8">
          <h2 className="text-xl font-black text-gray-900 dark:text-slate-100 text-center mb-1">
            تسجيل دخول المسؤول
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 text-center mb-6">
            أدخل بيانات حسابك للوصول إلى لوحة الإدارة
          </p>
          <AdminAuthForm onSuccess={() => {}} />
        </div>
      </motion.div>
    </div>
  );
}
