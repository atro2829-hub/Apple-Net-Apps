"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { ref, get } from "firebase/database";
import { AuthForm } from "@/components/AuthForm";
import { AppleNetLogo } from "@/components/AppleNetLogo";
import { Loader2 } from "lucide-react";
import { initFCMToken } from "@/lib/notifications";
import dynamic from "next/dynamic";

// Lazy load pages to reduce initial bundle size
const HomePage = dynamic(() => import("@/components/HomePage").then(m => ({ default: m.HomePage })), { ssr: false });
const CardsPage = dynamic(() => import("@/components/CardsPage").then(m => ({ default: m.CardsPage })), { ssr: false });
const CreditPage = dynamic(() => import("@/components/CreditPage").then(m => ({ default: m.CreditPage })), { ssr: false });
const DepositPage = dynamic(() => import("@/components/DepositPage").then(m => ({ default: m.DepositPage })), { ssr: false });
const PurchasedPage = dynamic(() => import("@/components/PurchasedPage").then(m => ({ default: m.PurchasedPage })), { ssr: false });
const ProfilePage = dynamic(() => import("@/components/ProfilePage").then(m => ({ default: m.ProfilePage })), { ssr: false });
const MorePage = dynamic(() => import("@/components/MorePage").then(m => ({ default: m.MorePage })), { ssr: false });
const StarlinkPage = dynamic(() => import("@/components/StarlinkPage").then(m => ({ default: m.StarlinkPage })), { ssr: false });
const TelecomRechargePage = dynamic(() => import("@/components/TelecomRechargePage").then(m => ({ default: m.TelecomRechargePage })), { ssr: false });
const ChatPage = dynamic(() => import("@/components/ChatPage").then(m => ({ default: m.ChatPage })), { ssr: false });

import {
  Home, Wifi, Wallet, MoreHorizontal
} from "lucide-react";

// ─── Tab definitions ──────────────────────────────────────
const MAIN_TABS = [
  { id: "home", label: "الرئيسية", icon: Home },
  { id: "cards", label: "الكروت", icon: Wifi },
  { id: "credit", label: "الرصيد", icon: Wallet },
  { id: "more", label: "المزيد", icon: MoreHorizontal },
];

// ─── Loading fallback ─────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[50vh]">
      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT - User App Entry Point
// ═══════════════════════════════════════════════════════════
export default function UserAppPage() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [activeTab, setActiveTab] = useState("home");

  // ─── Auth State Listener ─────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setLoading(false);

      if (user) {
        try {
          const roleSnapshot = await get(ref(db, `users/${user.uid}/role`));
          const role = roleSnapshot.val();
          setIsAdmin(role === "admin" || role === "network_manager");
          // Initialize FCM for push notifications
          initFCMToken(user.uid).catch(() => {});
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // ─── Auth handlers ───────────────────────────────────────
  const handleAuthClick = useCallback(() => {
    setAuthMode("login");
  }, []);

  const handleSwitchAuthMode = useCallback(() => {
    setAuthMode(prev => prev === "login" ? "register" : "login");
  }, []);

  // ─── Navigate helper ────────────────────────────────────
  const handleNavigate = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  // ─── Loading State ───────────────────────────────────────
  if (loading) {
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
            <p className="text-white/70 text-sm mt-3 font-medium">جاري التحميل...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Not authenticated - show login/register ─────────────
  if (!firebaseUser) {
    return (
      <AuthForm
        mode={authMode}
        onSuccess={() => {}}
        onSwitchMode={handleSwitchAuthMode}
      />
    );
  }

  // ─── Main App with Tabs ─────────────────────────────────
  const renderPage = () => {
    switch (activeTab) {
      case "home":
        return (
          <HomePage
            user={firebaseUser}
            isAdmin={isAdmin}
            onAuthClick={handleAuthClick}
            onNavigate={handleNavigate}
          />
        );
      case "cards":
        return (
          <CardsPage
            user={firebaseUser}
            onAuthClick={handleAuthClick}
          />
        );
      case "credit":
        return (
          <CreditPage
            user={firebaseUser}
            onAuthClick={handleAuthClick}
            onNavigate={handleNavigate}
          />
        );
      case "deposit":
        return (
          <DepositPage
            user={firebaseUser}
            onAuthClick={handleAuthClick}
          />
        );
      case "purchased":
        return (
          <PurchasedPage
            user={firebaseUser}
            onAuthClick={handleAuthClick}
          />
        );
      case "profile":
        return (
          <ProfilePage
            user={firebaseUser}
            onBack={() => setActiveTab("more")}
          />
        );
      case "starlink":
        return (
          <StarlinkPage
            user={firebaseUser}
            onAuthClick={handleAuthClick}
          />
        );
      case "telecom":
        return (
          <TelecomRechargePage
            user={firebaseUser}
            onAuthClick={handleAuthClick}
            onNavigate={handleNavigate}
          />
        );
      case "chat":
        return (
          <ChatPage
            user={firebaseUser}
            isAdmin={isAdmin}
          />
        );
      case "more":
        return (
          <MorePage
            user={firebaseUser}
            isAdmin={isAdmin}
            onAuthClick={handleAuthClick}
            onNavigate={handleNavigate}
          />
        );
      default:
        return (
          <HomePage
            user={firebaseUser}
            isAdmin={isAdmin}
            onAuthClick={handleAuthClick}
            onNavigate={handleNavigate}
          />
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-900" dir="rtl">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-20">
        <Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-gray-200/50 dark:border-slate-700/50 safe-area-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {MAIN_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all duration-200 ${
                  isActive ? "bg-emerald-50 dark:bg-emerald-900/30" : ""
                }`}>
                  <Icon className={`w-5 h-5 transition-all duration-200 ${isActive ? "scale-110" : ""}`} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className={`text-[10px] mt-0.5 font-medium transition-all ${isActive ? "font-bold" : ""}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
