"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { ref, get } from "firebase/database";
import { AdminPanel } from "@/components/AdminPanel";
import { AuthForm } from "@/components/AuthForm";
import { AppleNetLogo } from "@/components/AppleNetLogo";
import { Shield, Lock, Loader2 } from "lucide-react";
import { initFCMToken } from "@/lib/notifications";

type AuthState = "loading" | "unauthenticated" | "not_admin" | "admin";

export default function AdminPage() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setFirebaseUser(null);
        setAuthState("unauthenticated");
        return;
      }

      setFirebaseUser(user);

      try {
        const roleSnapshot = await get(ref(db, `users/${user.uid}/role`));
        const role = roleSnapshot.val();

        if (role === "admin" || role === "network_manager") {
          setAuthState("admin");
          // Initialize FCM for push notifications
          initFCMToken(user.uid).catch(() => {});
        } else {
          setAuthState("not_admin");
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
    return <AdminPanel onClose={() => {}} />;
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
          {/* Icon */}
          <div className="w-24 h-24 rounded-3xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 mb-6">
            <Shield className="w-12 h-12 text-white" />
          </div>

          {/* Logo */}
          <AppleNetLogo size="md" />

          {/* Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 w-full"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
              <Lock className="w-8 h-8 text-white/80 mx-auto mb-3" />
              <h2 className="text-white text-xl font-black mb-2">
                غير مصرح بالوصول
              </h2>
              <p className="text-white/60 text-sm leading-relaxed">
                ليس لديك صلاحيات إدارية للوصول إلى لوحة التحكم. يرجى تسجيل الدخول بحساب مسؤول.
              </p>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={async () => {
                const { signOut } = await import("firebase/auth");
                await signOut(auth);
              }}
              className="w-full mt-4 bg-white/15 hover:bg-white/25 text-white font-bold rounded-2xl h-12 transition-colors border border-white/20"
            >
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
      {/* Top Section with Logo */}
      <div className="flex-shrink-0 pt-12 pb-6 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="flex flex-col items-center gap-4"
        >
          {/* Shield Icon */}
          <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <Shield className="w-10 h-10 text-white" />
          </div>

          {/* Logo */}
          <AppleNetLogo size="lg" />

          {/* Admin Label */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/20"
          >
            <Lock className="w-3.5 h-3.5 text-white/70" />
            <span className="text-white/80 text-xs font-bold">
              لوحة الإدارة
            </span>
          </motion.div>
        </motion.div>
      </div>

      {/* Login Form Container */}
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

          <AnimatePresence mode="wait">
            <AuthForm
              key={authMode}
              mode={authMode}
              onSuccess={() => {
                // onAuthStateChanged will handle state update
              }}
              onSwitchMode={() => {
                setAuthMode(prev => prev === "login" ? "register" : "login");
              }}
              onBack={() => {
                setAuthMode("login");
              }}
            />
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
