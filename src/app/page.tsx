"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { ref, get } from "firebase/database";
import { AdminApp } from "@/components/admin/AdminApp";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AppleNetLogo } from "@/components/AppleNetLogo";
import { Shield, Lock, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { initFCMToken } from "@/lib/notifications";

type AuthState = "loading" | "unauthenticated" | "not_admin" | "admin" | "network_manager";

export default function AdminRootPage() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [managedNetwork, setManagedNetwork] = useState<string>("");

  // ─── Auth State Listener ─────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setFirebaseUser(null);
        setAuthState("unauthenticated");
        setManagedNetwork("");
        return;
      }

      setFirebaseUser(user);

      try {
        const roleSnapshot = await get(ref(db, `users/${user.uid}/role`));
        const role = roleSnapshot.val();

        if (role === "admin") {
          setAuthState("admin");
          // Initialize FCM for push notifications
          initFCMToken(user.uid).catch(() => {});
        } else if (role === "network_manager") {
          setAuthState("network_manager");
          const netSnapshot = await get(ref(db, `users/${user.uid}/managedNetwork`));
          setManagedNetwork(netSnapshot.val() || "");
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

  // ─── Admin or Network Manager Panel ─────────────────────
  if ((authState === "admin" || authState === "network_manager") && firebaseUser) {
    return (
      <AdminApp
        userRole={authState === "admin" ? "admin" : "network_manager"}
        managedNetwork={managedNetwork || undefined}
      />
    );
  }

  // ─── Not Admin ──────────────────────────────────────────
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
            </div>
            <Button
              onClick={async () => {
                const { signOut } = await import("firebase/auth");
                await signOut(auth);
              }}
              variant="ghost"
              className="w-full mt-4 text-white hover:bg-white/15 rounded-2xl h-12 border border-white/20"
            >
              <LogOut className="w-4 h-4 ml-2" />
              تسجيل الخروج
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ─── Unauthenticated — Show Login Screen ─────────────────
  return <AdminLogin />;
}
