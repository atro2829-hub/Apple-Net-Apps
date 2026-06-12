"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, Users, CreditCard, Receipt, Wifi, FileCheck,
  Wallet, Star, Satellite, Building2, Globe, Smartphone,
  Package, Megaphone, Image as ImageIcon, Gift, Banknote,
  Crown, Bell, FileText, Store, Settings as SettingsIcon,
  Menu, X, Search, LogOut, Moon, Sun, ChevronLeft,
  Activity, Download, Shield, Home, ClipboardList, TrendingUp
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { ref, onValue, get } from "firebase/database";
import { useLanguage } from "@/context/LanguageContext";
import { initFCMToken } from "@/lib/notifications";

// Section components
import { DashboardSection } from "./sections/DashboardSection";
import { UsersSection } from "./sections/UsersSection";
import { NetworksSection } from "./sections/NetworksSection";
import { CardsSection } from "./sections/CardsSection";
import { DepositsSection } from "./sections/DepositsSection";
import { BalancesSection } from "./sections/BalancesSection";
import { TiersSection } from "./sections/TiersSection";
import { StarlinkSection } from "./sections/StarlinkSection";
import { BanksSection } from "./sections/BanksSection";
import { TelecomSection } from "./sections/TelecomSection";
import { SimsSection } from "./sections/SimsSection";
import { AdsSection } from "./sections/AdsSection";
import { BannersSection } from "./sections/BannersSection";
import { GiftsSection } from "./sections/GiftsSection";
import { CommissionsSection } from "./sections/CommissionsSection";
import { SubscriptionsSection } from "./sections/SubscriptionsSection";
import { NotificationsSection } from "./sections/NotificationsSection";
import { ReportsSection } from "./sections/ReportsSection";
import { ContentSection } from "./sections/ContentSection";
import { SaleLocationsSection } from "./sections/SaleLocationsSection";
import { SettingsSection } from "./sections/SettingsSection";
import { NetworkRequestsSection } from "./sections/NetworkRequestsSection";
import { ActivityLogSection } from "./sections/ActivityLogSection";

// ─── Navigation Items ────────────────────────────────────
interface NavItem {
  id: string;
  icon: React.ElementType;
  labelAr: string;
  labelEn: string;
  badge?: number;
  group: "main" | "management" | "finance" | "marketing" | "system";
}

const ADMIN_NAV: NavItem[] = [
  { id: "dashboard", icon: Home, labelAr: "الرئيسية", labelEn: "Home", group: "main" },
  { id: "dashboard-stats", icon: BarChart3, labelAr: "لوحة الإحصائيات", labelEn: "Statistics", group: "main" },
  { id: "activity", icon: Activity, labelAr: "النشاط المباشر", labelEn: "Live Activity", group: "main" },
  { id: "balances", icon: Wallet, labelAr: "الأرصدة", labelEn: "Balances", group: "main" },
  { id: "users", icon: Users, labelAr: "المستخدمين", labelEn: "Users", group: "management" },
  { id: "networks", icon: Wifi, labelAr: "الشبكات", labelEn: "Networks", group: "management" },
  { id: "networkRequests", icon: FileCheck, labelAr: "طلبات الشبكات", labelEn: "Network Requests", group: "management" },
  { id: "cards", icon: CreditCard, labelAr: "البطاقات", labelEn: "Cards", group: "management" },
  { id: "deposits", icon: Receipt, labelAr: "الإيداعات", labelEn: "Deposits", group: "management" },
  { id: "tiers", icon: Star, labelAr: "فئات الأسعار", labelEn: "Price Tiers", group: "management" },
  { id: "starlink", icon: Satellite, labelAr: "Starlink", labelEn: "Starlink", group: "management" },
  { id: "banks", icon: Building2, labelAr: "البنوك", labelEn: "Banks", group: "finance" },
  { id: "telecom", icon: Globe, labelAr: "الاتصالات", labelEn: "Telecom", group: "finance" },
  { id: "sims", icon: Smartphone, labelAr: "شرائح SIM", labelEn: "SIM Cards", group: "finance" },
  { id: "gifts", icon: Gift, labelAr: "أكواد الهدايا", labelEn: "Gift Codes", group: "finance" },
  { id: "commissions", icon: Banknote, labelAr: "العمولات", labelEn: "Commissions", group: "finance" },
  { id: "subscriptions", icon: Crown, labelAr: "الاشتراكات", labelEn: "Subscriptions", group: "finance" },
  { id: "ads", icon: Megaphone, labelAr: "الإعلانات", labelEn: "Ads", group: "marketing" },
  { id: "banners", icon: ImageIcon, labelAr: "البانرات", labelEn: "Banners", group: "marketing" },
  { id: "notifications", icon: Bell, labelAr: "الإشعارات", labelEn: "Notifications", group: "marketing" },
  { id: "reports", icon: FileText, labelAr: "التقارير", labelEn: "Reports", group: "system" },
  { id: "content", icon: ClipboardList, labelAr: "المحتوى", labelEn: "Content", group: "system" },
  { id: "saleLocations", icon: Store, labelAr: "مواقع البيع", labelEn: "Sale Locations", group: "system" },
  { id: "activityLog", icon: ClipboardList, labelAr: "سجل النشاط", labelEn: "Activity Log", group: "system" },
  { id: "settings", icon: SettingsIcon, labelAr: "الإعدادات", labelEn: "Settings", group: "system" },
];

const NAV_GROUPS: Record<string, { ar: string; en: string }> = {
  main: { ar: "الرئيسية", en: "Main" },
  management: { ar: "الإدارة", en: "Management" },
  finance: { ar: "المالية", en: "Finance" },
  marketing: { ar: "التسويق", en: "Marketing" },
  system: { ar: "النظام", en: "System" },
};

const NETWORK_MANAGER_NAV: NavItem[] = [
  { id: "dashboard", icon: Home, labelAr: "الرئيسية", labelEn: "Home", group: "main" },
  { id: "dashboard-stats", icon: BarChart3, labelAr: "الإحصائيات", labelEn: "Statistics", group: "main" },
  { id: "cards", icon: CreditCard, labelAr: "البطاقات", labelEn: "Cards", group: "management" },
  { id: "tiers", icon: Star, labelAr: "الفئات", labelEn: "Tiers", group: "management" },
  { id: "deposits", icon: Receipt, labelAr: "الإيداعات", labelEn: "Deposits", group: "management" },
  { id: "commissions", icon: Banknote, labelAr: "العمولات", labelEn: "Commissions", group: "finance" },
  { id: "saleLocations", icon: Store, labelAr: "مواقع البيع", labelEn: "Sale Locations", group: "system" },
  { id: "settings", icon: SettingsIcon, labelAr: "إعدادات الشبكة", labelEn: "Network Settings", group: "system" },
];

// ─── Props ───────────────────────────────────────────────
interface AdminAppProps {
  userRole: "admin" | "network_manager";
  managedNetwork?: string;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export function AdminApp({ userRole, managedNetwork }: AdminAppProps) {
  const { isRTL } = useLanguage();
  const isAr = isRTL;

  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  // Notification state
  const [notifCount, setNotifCount] = useState(0);

  // Quick stats for header
  const [pendingDeposits, setPendingDeposits] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [pendingNetworkReqs, setPendingNetworkReqs] = useState(0);

  const navItems = userRole === "admin" ? ADMIN_NAV : NETWORK_MANAGER_NAV;

  // ─── Theme toggle ──────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("admin-theme");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem("admin-theme", next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }, []);

  // ─── Real-time pending counts ──────────────────────────
  useEffect(() => {
    if (userRole !== "admin") return;
    const unsubs: (() => void)[] = [];

    const depUnsub = onValue(ref(db, "depositRequests"), snap => {
      const data = snap.val() || {};
      const pending = Object.values(data).filter((d: any) => d.status === "pending").length;
      setPendingDeposits(pending);
    });
    unsubs.push(depUnsub);

    const ordUnsub = onValue(ref(db, "starlinkOrders"), snap => {
      const data = snap.val() || {};
      const pending = Object.values(data).filter((o: any) => o.status === "pending").length;
      setPendingOrders(pending);
    });
    unsubs.push(ordUnsub);

    const netUnsub = onValue(ref(db, "networkSubmissions"), snap => {
      const data = snap.val() || {};
      const pending = Object.values(data).filter((s: any) => s.status === "pending").length;
      setPendingNetworkReqs(pending);
    });
    unsubs.push(netUnsub);

    return () => unsubs.forEach(u => u());
  }, [userRole]);

  // ─── Update notification badge ─────────────────────────
  useEffect(() => {
    setNotifCount(pendingDeposits + pendingOrders + pendingNetworkReqs);
  }, [pendingDeposits, pendingOrders, pendingNetworkReqs]);

  // ─── Active nav item with badge ────────────────────────
  const getNavBadge = (id: string): number => {
    if (id === "deposits") return pendingDeposits;
    if (id === "starlink") return pendingOrders;
    if (id === "networkRequests") return pendingNetworkReqs;
    return 0;
  };

  // ─── Render active section ─────────────────────────────
  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardSection userRole={userRole} managedNetwork={managedNetwork} />;
      case "dashboard-stats":
        return <DashboardSection userRole={userRole} managedNetwork={managedNetwork} showStats />;
      case "activity":
        return <ActivityLogSection />;
      case "balances":
        return <BalancesSection />;
      case "users":
        return <UsersSection />;
      case "networks":
        return <NetworksSection />;
      case "networkRequests":
        return <NetworkRequestsSection />;
      case "cards":
        return <CardsSection managedNetwork={managedNetwork} />;
      case "deposits":
        return <DepositsSection />;
      case "tiers":
        return <TiersSection managedNetwork={managedNetwork} />;
      case "starlink":
        return <StarlinkSection />;
      case "banks":
        return <BanksSection />;
      case "telecom":
        return <TelecomSection />;
      case "sims":
        return <SimsSection />;
      case "ads":
        return <AdsSection />;
      case "banners":
        return <BannersSection />;
      case "gifts":
        return <GiftsSection />;
      case "commissions":
        return <CommissionsSection managedNetwork={managedNetwork} />;
      case "subscriptions":
        return <SubscriptionsSection />;
      case "notifications":
        return <NotificationsSection />;
      case "reports":
        return <ReportsSection />;
      case "content":
        return <ContentSection />;
      case "saleLocations":
        return <SaleLocationsSection managedNetwork={managedNetwork} />;
      case "activityLog":
        return <ActivityLogSection />;
      case "settings":
        return <SettingsSection managedNetwork={managedNetwork} />;
      default:
        return <DashboardSection userRole={userRole} managedNetwork={managedNetwork} />;
    }
  };

  // ─── Get active label ─────────────────────────────────
  const activeNav = navItems.find(n => n.id === activeSection);
  const activeLabel = activeNav ? (isAr ? activeNav.labelAr : activeNav.labelEn) : "";

  // ─── Filter nav by search ──────────────────────────────
  const filteredNav = searchQuery
    ? navItems.filter(n =>
        n.labelAr.includes(searchQuery) ||
        n.labelEn.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : navItems;

  // ─── Group filtered nav ────────────────────────────────
  const groupedNav: Record<string, NavItem[]> = {};
  filteredNav.forEach(item => {
    if (!groupedNav[item.group]) groupedNav[item.group] = [];
    groupedNav[item.group].push(item);
  });

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden" dir="rtl">
      {/* ═══ Sidebar Overlay (mobile) ═══ */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ═══ Sidebar ═══ */}
      <motion.aside
        className={`
          fixed lg:static inset-y-0 right-0 z-50 w-72
          bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800
          flex flex-col shadow-xl lg:shadow-none
          transform transition-transform duration-300 ease-out
          ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Sidebar Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-black text-gray-900 dark:text-white">Apple.NET</h1>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  {userRole === "admin" ? "لوحة الإدارة" : "مدير الشبكة"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Search */}
          <div className={`relative ${searchFocused ? "ring-2 ring-emerald-500/30" : ""} rounded-xl transition-all`}>
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder={isAr ? "بحث..." : "Search..."}
              className="w-full h-9 pr-9 pl-3 rounded-xl bg-gray-100 dark:bg-slate-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 border-0 outline-none"
            />
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1 scrollbar-thin">
          {Object.entries(NAV_GROUPS).map(([groupKey, groupLabel]) => {
            const items = groupedNav[groupKey];
            if (!items || items.length === 0) return null;

            return (
              <div key={groupKey} className="mb-2">
                <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider px-3 py-1.5">
                  {isAr ? groupLabel.ar : groupLabel.en}
                </p>
                {items.map(item => {
                  const isActive = activeSection === item.id;
                  const badge = getNavBadge(item.id);
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                        transition-all duration-200 relative group
                        ${isActive
                          ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 shadow-sm"
                          : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                        }
                      `}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeNavIndicator"
                          className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-500 rounded-l-full"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                      <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? "text-emerald-600 dark:text-emerald-400" : ""}`} />
                      <span className="flex-1 text-right">{isAr ? item.labelAr : item.labelEn}</span>
                      {badge > 0 && (
                        <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 animate-pulse">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="flex-shrink-0 p-3 border-t border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 dark:bg-slate-800">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
              {auth.currentUser?.email?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                {auth.currentUser?.email || "Admin"}
              </p>
              <p className="text-[10px] text-gray-400">
                {userRole === "admin" ? "مسؤول" : "مدير شبكة"}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-400" />}
            </button>
            <button
              onClick={async () => {
                const { signOut } = await import("firebase/auth");
                await signOut(auth);
              }}
              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* ═══ Main Content ═══ */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 h-14 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center px-4 gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600 dark:text-slate-300" />
          </button>

          <div className="flex-1 flex items-center gap-2">
            <ChevronLeft className="w-4 h-4 text-gray-400 hidden lg:block" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {activeLabel}
            </h2>
          </div>

          {/* Quick Stats */}
          {userRole === "admin" && notifCount > 0 && (
            <div className="hidden md:flex items-center gap-2">
              {pendingDeposits > 0 && (
                <button
                  onClick={() => setActiveSection("deposits")}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  {pendingDeposits} إيداع
                </button>
              )}
              {pendingOrders > 0 && (
                <button
                  onClick={() => setActiveSection("starlink")}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <Satellite className="w-3.5 h-3.5" />
                  {pendingOrders} طلب
                </button>
              )}
              {pendingNetworkReqs > 0 && (
                <button
                  onClick={() => setActiveSection("networkRequests")}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                >
                  <Wifi className="w-3.5 h-3.5" />
                  {pendingNetworkReqs} شبكة
                </button>
              )}
            </div>
          )}

          {/* Notification Bell */}
          <button
            onClick={() => setActiveSection("notifications")}
            className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-600 dark:text-slate-300" />
            {notifCount > 0 && (
              <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center animate-pulse">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="p-4 md:p-6"
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
