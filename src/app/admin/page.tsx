"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { ref, get } from "firebase/database";
import { AdminApp } from "@/components/admin/AdminApp";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { initFCMToken } from "@/lib/notifications";
import { Shield, Lock, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

type AuthState = "loading" | "unauthenticated" | "not_admin" | "admin" | "network_manager";

export default function AdminPage() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [managedNetwork, setManagedNetwork] = useState<string>("");

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
          // Initialize FCM for push notifications
          initFCMToken(user.uid).catch(() => {});
        } else if (role === "network_manager") {
          setAuthState("network_manager");
          setUserRole("network_manager");
          const netSnapshot = await get(ref(db, `users/${user.uid}/managedNetwork`));
          setManagedNetwork(netSnapshot.val() || "");
          // Initialize FCM for push notifications
          initFCMToken(user.uid).catch(() => {});
        } else {
          setAuthState("not_admin");
          setUserRole(role || "user");
        }
      } catch {
        setAuthState("not_admin");
      }
    });

    return () => unsubscribe();
  }, []);

  // ─── Loading State ───────────────────────────────────────
  if (authState === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 flex flex-col items-center justify-center" dir="rtl">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-2xl">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-white">Apple.NET</h1>
            <p className="text-emerald-200 text-sm font-medium mt-1">لوحة الإدارة والتحكم</p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Loader2 className="w-4 h-4 text-white/70 animate-spin" />
            <p className="text-white/70 text-sm font-medium">جاري التحقق من الصلاحيات...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Admin or Network Manager Panel ─────────────────────
  if ((authState === "admin" || authState === "network_manager") && firebaseUser) {
    return (
      <AdminApp
        userRole={authState === "admin" ? "admin" : "network_manager"}
        managedNetwork={managedNetwork || undefined}
      />
    );
  }

  // ─── Not Admin (Logged in but no permission) ─────────────
  if (authState === "not_admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 flex flex-col items-center justify-center p-6" dir="rtl">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-full max-w-sm flex flex-col items-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 mb-6">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Apple.NET</h1>
          <p className="text-emerald-200 text-sm mb-6">لوحة الإدارة والتحكم</p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
              <Shield className="w-8 h-8 text-white/80 mx-auto mb-3" />
              <h2 className="text-white text-xl font-black mb-2">غير مصرح بالوصول</h2>
              <p className="text-white/60 text-sm leading-relaxed mb-2">
                ليس لديك صلاحيات إدارية للوصول إلى لوحة التحكم.
              </p>
              <p className="text-white/40 text-xs">الرتبة الحالية: {userRole || "مستخدم"}</p>
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
  return <AdminLogin />;
}
