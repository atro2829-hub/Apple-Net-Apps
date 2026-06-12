"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  BarChart3, Users, CreditCard, Receipt, Wifi, FileCheck,
  Wallet, Star, Satellite, Building2, Globe, Smartphone,
  Package, Megaphone, Image as ImageIcon, Gift, Banknote,
  Crown, Bell, FileText, Store, Settings as SettingsIcon,
  Menu, X, Search, LogOut, Moon, Sun,
  Activity, Download, Shield, Home, ClipboardList, TrendingUp,
  ChevronRight, ChevronLeft, Zap, Clock, DollarSign,
  ArrowUpRight, ArrowDownRight, RefreshCw, AlertTriangle,
  CheckCircle2, XCircle, Eye, Layers
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { ref, onValue, get } from "firebase/database";
import { useLanguage } from "@/context/LanguageContext";
import { initFCMToken } from "@/lib/notifications";

// Section components - lazy loaded
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

// ─── Navigation Configuration ────────────────────────────
interface NavItem {
  id: string;
  icon: React.ElementType;
  labelAr: string;
  labelEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  color: string;
  bgColor: string;
  badge?: number;
  group: "main" | "management" | "finance" | "marketing" | "system";
}

const ADMIN_NAV: NavItem[] = [
  { id: "dashboard", icon: Home, labelAr: "الرئيسية", labelEn: "Home", descriptionAr: "نظرة عامة وإحصائيات", descriptionEn: "Overview & Stats", color: "text-emerald-600", bgColor: "bg-emerald-50", group: "main" },
  { id: "dashboard-stats", icon: BarChart3, labelAr: "لوحة الإحصائيات", labelEn: "Statistics", descriptionAr: "رسوم بيانية وتحليلات", descriptionEn: "Charts & Analytics", color: "text-blue-600", bgColor: "bg-blue-50", group: "main" },
  { id: "activity", icon: Activity, labelAr: "النشاط المباشر", labelEn: "Live Activity", descriptionAr: "أحداث لحظية", descriptionEn: "Real-time events", color: "text-orange-600", bgColor: "bg-orange-50", group: "main" },
  { id: "balances", icon: Wallet, labelAr: "الأرصدة", labelEn: "Balances", descriptionAr: "إدارة الأرصدة", descriptionEn: "Balance management", color: "text-amber-600", bgColor: "bg-amber-50", group: "main" },
  { id: "users", icon: Users, labelAr: "المستخدمين", labelEn: "Users", descriptionAr: "إدارة حسابات المستخدمين", descriptionEn: "User accounts management", color: "text-indigo-600", bgColor: "bg-indigo-50", group: "management" },
  { id: "networks", icon: Wifi, labelAr: "الشبكات", labelEn: "Networks", descriptionAr: "إدارة شبكات الإنترنت", descriptionEn: "Internet networks", color: "text-cyan-600", bgColor: "bg-cyan-50", group: "management" },
  { id: "networkRequests", icon: FileCheck, labelAr: "طلبات الشبكات", labelEn: "Network Requests", descriptionAr: "طلبات الانضمام الجديدة", descriptionEn: "New join requests", color: "text-teal-600", bgColor: "bg-teal-50", group: "management" },
  { id: "cards", icon: CreditCard, labelAr: "البطاقات", labelEn: "Cards", descriptionAr: "إدارة بطاقات الإنترنت", descriptionEn: "Internet cards", color: "text-violet-600", bgColor: "bg-violet-50", group: "management" },
  { id: "deposits", icon: Receipt, labelAr: "الإيداعات", labelEn: "Deposits", descriptionAr: "طلبات الإيداع المعلقة", descriptionEn: "Pending deposits", color: "text-pink-600", bgColor: "bg-pink-50", group: "management" },
  { id: "tiers", icon: Star, labelAr: "فئات الأسعار", labelEn: "Price Tiers", descriptionAr: "تحديد أسعار البطاقات", descriptionEn: "Card pricing tiers", color: "text-yellow-600", bgColor: "bg-yellow-50", group: "management" },
  { id: "starlink", icon: Satellite, labelAr: "Starlink", labelEn: "Starlink", descriptionAr: "إدارة طلبات ستارلينك", descriptionEn: "Starlink orders", color: "text-sky-600", bgColor: "bg-sky-50", group: "management" },
  { id: "banks", icon: Building2, labelAr: "البنوك", labelEn: "Banks", descriptionAr: "حسابات بنكية", descriptionEn: "Bank accounts", color: "text-emerald-600", bgColor: "bg-emerald-50", group: "finance" },
  { id: "telecom", icon: Globe, labelAr: "الاتصالات", labelEn: "Telecom", descriptionAr: "مزودي ومجموعات الاتصالات", descriptionEn: "Telecom providers & packages", color: "text-blue-600", bgColor: "bg-blue-50", group: "finance" },
  { id: "sims", icon: Smartphone, labelAr: "شرائح SIM", labelEn: "SIM Cards", descriptionAr: "إدارة شرائح الاتصال", descriptionEn: "SIM card management", color: "text-purple-600", bgColor: "bg-purple-50", group: "finance" },
  { id: "gifts", icon: Gift, labelAr: "أكواد الهدايا", labelEn: "Gift Codes", descriptionAr: "أكواد خصم وهدايا", descriptionEn: "Discount & gift codes", color: "text-rose-600", bgColor: "bg-rose-50", group: "finance" },
  { id: "commissions", icon: Banknote, labelAr: "العمولات", labelEn: "Commissions", descriptionAr: "تقارير العمولات", descriptionEn: "Commission reports", color: "text-green-600", bgColor: "bg-green-50", group: "finance" },
  { id: "subscriptions", icon: Crown, labelAr: "الاشتراكات", labelEn: "Subscriptions", descriptionAr: "باقات الاشتراك", descriptionEn: "Subscription plans", color: "text-amber-600", bgColor: "bg-amber-50", group: "finance" },
  { id: "ads", icon: Megaphone, labelAr: "الإعلانات", labelEn: "Ads", descriptionAr: "إدارة الإعلانات", descriptionEn: "Ads management", color: "text-red-600", bgColor: "bg-red-50", group: "marketing" },
  { id: "banners", icon: ImageIcon, labelAr: "البانرات", labelEn: "Banners", descriptionAr: "بانرات الصفحة الرئيسية", descriptionEn: "Homepage banners", color: "text-orange-600", bgColor: "bg-orange-50", group: "marketing" },
  { id: "notifications", icon: Bell, labelAr: "الإشعارات", labelEn: "Notifications", descriptionAr: "إرسال إشعارات جماعية", descriptionEn: "Bulk notifications", color: "text-indigo-600", bgColor: "bg-indigo-50", group: "marketing" },
  { id: "reports", icon: FileText, labelAr: "التقارير", labelEn: "Reports", descriptionAr: "تقارير PDF للتحميل", descriptionEn: "PDF reports download", color: "text-slate-600", bgColor: "bg-slate-50", group: "system" },
  { id: "content", icon: ClipboardList, labelAr: "المحتوى", labelEn: "Content", descriptionAr: "إدارة محتوى التطبيق", descriptionEn: "App content", color: "text-gray-600", bgColor: "bg-gray-50", group: "system" },
  { id: "saleLocations", icon: Store, labelAr: "مواقع البيع", labelEn: "Sale Locations", descriptionAr: "نقاط البيع المعتمدة", descriptionEn: "Authorized sale points", color: "text-teal-600", bgColor: "bg-teal-50", group: "system" },
  { id: "activityLog", icon: ClipboardList, labelAr: "سجل النشاط", labelEn: "Activity Log", descriptionAr: "سجل كامل العمليات", descriptionEn: "Full activity log", color: "text-zinc-600", bgColor: "bg-zinc-50", group: "system" },
  { id: "settings", icon: SettingsIcon, labelAr: "الإعدادات", labelEn: "Settings", descriptionAr: "إعدادات النظام", descriptionEn: "System settings", color: "text-gray-600", bgColor: "bg-gray-50", group: "system" },
];

const NETWORK_MANAGER_NAV: NavItem[] = [
  { id: "dashboard", icon: Home, labelAr: "الرئيسية", labelEn: "Home", color: "text-emerald-600", bgColor: "bg-emerald-50", group: "main" },
  { id: "dashboard-stats", icon: BarChart3, labelAr: "الإحصائيات", labelEn: "Statistics", color: "text-blue-600", bgColor: "bg-blue-50", group: "main" },
  { id: "cards", icon: CreditCard, labelAr: "البطاقات", labelEn: "Cards", color: "text-violet-600", bgColor: "bg-violet-50", group: "management" },
  { id: "tiers", icon: Star, labelAr: "الفئات", labelEn: "Tiers", color: "text-yellow-600", bgColor: "bg-yellow-50", group: "management" },
  { id: "deposits", icon: Receipt, labelAr: "الإيداعات", labelEn: "Deposits", color: "text-pink-600", bgColor: "bg-pink-50", group: "management" },
  { id: "commissions", icon: Banknote, labelAr: "العمولات", labelEn: "Commissions", color: "text-green-600", bgColor: "bg-green-50", group: "finance" },
  { id: "saleLocations", icon: Store, labelAr: "مواقع البيع", labelEn: "Sale Locations", color: "text-teal-600", bgColor: "bg-teal-50", group: "system" },
  { id: "settings", icon: SettingsIcon, labelAr: "إعدادات الشبكة", labelEn: "Network Settings", color: "text-gray-600", bgColor: "bg-gray-50", group: "system" },
];

const NAV_GROUPS: Record<string, { ar: string; en: string }> = {
  main: { ar: "الرئيسية", en: "Main" },
  management: { ar: "الإدارة", en: "Management" },
  finance: { ar: "المالية", en: "Finance" },
  marketing: { ar: "التسويق", en: "Marketing" },
  system: { ar: "النظام", en: "System" },
};

// ─── Animation variants ──────────────────────────────────
const pageVariants = {
  initial: { opacity: 0, x: -20, scale: 0.98 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 20, scale: 0.98 },
};

const drawerVariants = {
  closed: { x: "100%" },
  open: { x: 0 },
};

const overlayVariants = {
  closed: { opacity: 0 },
  open: { opacity: 1 },
};

// ─── Props ───────────────────────────────────────────────
interface AdminAppProps {
  userRole: "admin" | "network_manager";
  managedNetwork?: string;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT - Professional Mobile Admin App
// ═══════════════════════════════════════════════════════════
export function AdminApp({ userRole, managedNetwork }: AdminAppProps) {
  const { isRTL } = useLanguage();
  const isAr = isRTL;

  const [activeSection, setActiveSection] = useState("dashboard");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  // Real-time pending counts
  const [pendingDeposits, setPendingDeposits] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [pendingNetworkReqs, setPendingNetworkReqs] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const navItems = userRole === "admin" ? ADMIN_NAV : NETWORK_MANAGER_NAV;

  // ─── Theme ──────────────────────────────────────────────
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

  // ─── Real-time data ────────────────────────────────────
  useEffect(() => {
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

    const usersUnsub = onValue(ref(db, "users"), snap => {
      const data = snap.val() || {};
      setTotalUsers(Object.keys(data).length);
    });
    unsubs.push(usersUnsub);

    if (userRole === "admin") {
      const revUnsub = onValue(ref(db, "cards"), snap => {
        const data = snap.val() || {};
        const sold = Object.values(data).filter((c: any) => c.isUsed);
        const rev = sold.reduce((sum: number, c: any) => sum + (c.price || 0), 0);
        setTotalRevenue(rev);
      });
      unsubs.push(revUnsub);
    }

    return () => unsubs.forEach(u => u());
  }, [userRole]);

  // ─── FCM init ─────────────────────────────────────────
  useEffect(() => {
    if (auth.currentUser) {
      initFCMToken(auth.currentUser.uid).catch(() => {});
    }
  }, []);

  const notifCount = pendingDeposits + pendingOrders + pendingNetworkReqs;

  const getNavBadge = (id: string): number => {
    if (id === "deposits") return pendingDeposits;
    if (id === "starlink") return pendingOrders;
    if (id === "networkRequests") return pendingNetworkReqs;
    return 0;
  };

  // ─── Render section content ────────────────────────────
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

  const activeNav = navItems.find(n => n.id === activeSection);
  const activeLabel = activeNav ? (isAr ? activeNav.labelAr : activeNav.labelEn) : "";

  // Filter nav by search
  const filteredNav = searchQuery
    ? navItems.filter(n =>
        n.labelAr.includes(searchQuery) ||
        n.labelEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.descriptionAr && n.descriptionAr.includes(searchQuery))
      )
    : navItems;

  // Group filtered nav
  const groupedNav: Record<string, NavItem[]> = {};
  filteredNav.forEach(item => {
    if (!groupedNav[item.group]) groupedNav[item.group] = [];
    groupedNav[item.group].push(item);
  });

  // Quick stats for dashboard view
  const quickStats = useMemo(() => {
    if (activeSection !== "dashboard") return null;
    return [
      { icon: Users, value: totalUsers, label: isAr ? "مستخدم" : "Users", color: "from-indigo-500 to-indigo-600" },
      { icon: Receipt, value: pendingDeposits, label: isAr ? "إيداع معلق" : "Pending", color: "from-amber-500 to-amber-600" },
      { icon: DollarSign, value: totalRevenue, label: isAr ? "إيرادات" : "Revenue", color: "from-emerald-500 to-emerald-600" },
      { icon: Satellite, value: pendingOrders, label: isAr ? "طلب ستارلينك" : "Starlink", color: "from-sky-500 to-sky-600" },
    ];
  }, [activeSection, totalUsers, pendingDeposits, totalRevenue, pendingOrders, isAr]);

  // Navigate to section
  const navigateTo = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    setDrawerOpen(false);
    setSearchQuery("");
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0a0f1a] overflow-hidden" dir="rtl">
      {/* ═══ Drawer Overlay ═══ */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            variants={overlayVariants}
            initial="closed"
            animate="open"
            exit="closed"
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ═══ Navigation Drawer ═══ */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.aside
            variants={drawerVariants}
            initial="closed"
            animate="open"
            exit="closed"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 right-0 z-50 w-[300px] bg-white dark:bg-[#111827] shadow-2xl flex flex-col"
          >
            {/* Drawer Header */}
            <div className="flex-shrink-0">
              <div className="p-4 bg-gradient-to-l from-emerald-600 to-emerald-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h1 className="text-sm font-black text-white">Apple.NET</h1>
                      <p className="text-[10px] text-emerald-100 font-semibold">
                        {userRole === "admin" ? "لوحة الإدارة" : "مدير الشبكة"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Search */}
                <div className={`relative rounded-xl overflow-hidden transition-all ${searchFocused ? "ring-2 ring-white/40" : ""}`}>
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    placeholder={isAr ? "بحث في القائمة..." : "Search menu..."}
                    className="w-full h-9 pr-9 pl-3 rounded-xl bg-white/15 backdrop-blur-sm text-sm text-white placeholder:text-white/50 border-0 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Drawer Navigation */}
            <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
              {Object.entries(NAV_GROUPS).map(([groupKey, groupLabel]) => {
                const items = groupedNav[groupKey];
                if (!items || items.length === 0) return null;

                return (
                  <div key={groupKey} className="mb-2">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 py-1.5">
                      {isAr ? groupLabel.ar : groupLabel.en}
                    </p>
                    {items.map(item => {
                      const isActive = activeSection === item.id;
                      const badge = getNavBadge(item.id);
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.id}
                          onClick={() => navigateTo(item.id)}
                          className={`
                            w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium
                            transition-all duration-200 relative
                            ${isActive
                              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                            }
                          `}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="drawerActiveIndicator"
                              className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-emerald-500 rounded-l-full"
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                          )}
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isActive ? "bg-emerald-100 dark:bg-emerald-800/40" : "bg-slate-100 dark:bg-slate-800"}`}>
                            <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`} />
                          </div>
                          <span className="flex-1 text-right">{isAr ? item.labelAr : item.labelEn}</span>
                          {badge > 0 && (
                            <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1">
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

            {/* Drawer Footer - User Profile */}
            <div className="flex-shrink-0 p-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-emerald-500/20">
                  {auth.currentUser?.email?.charAt(0).toUpperCase() || "A"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {auth.currentUser?.email || "Admin"}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {userRole === "admin" ? (isAr ? "مسؤول النظام" : "System Admin") : (isAr ? "مدير شبكة" : "Network Manager")}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleTheme}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                  <button
                    onClick={async () => {
                      const { signOut } = await import("firebase/auth");
                      await signOut(auth);
                    }}
                    className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ═══ Main Content Area ═══ */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ─── Professional Top Header ─── */}
        <header className="flex-shrink-0 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center h-14 px-4 gap-3">
            {/* Menu button */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
            >
              <Menu className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </button>

            {/* Section title */}
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                {activeLabel}
              </h2>
            </div>

            {/* Quick action badges */}
            {userRole === "admin" && (
              <div className="flex items-center gap-1.5">
                {pendingDeposits > 0 && (
                  <button
                    onClick={() => navigateTo("deposits")}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                  >
                    <Receipt className="w-3 h-3" />
                    {pendingDeposits}
                  </button>
                )}
                {pendingOrders > 0 && (
                  <button
                    onClick={() => navigateTo("starlink")}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 text-[10px] font-bold hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors"
                  >
                    <Satellite className="w-3 h-3" />
                    {pendingOrders}
                  </button>
                )}
              </div>
            )}

            {/* Notification bell */}
            <button
              onClick={() => navigateTo("notifications")}
              className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              {notifCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[7px] font-bold flex items-center justify-center"
                >
                  {notifCount > 9 ? "9+" : notifCount}
                </motion.span>
              )}
            </button>
          </div>
        </header>

        {/* ─── Quick Stats Bar (Dashboard only) ─── */}
        {activeSection === "dashboard" && quickStats && (
          <div className="flex-shrink-0 p-3 pb-0">
            <div className="grid grid-cols-4 gap-2">
              {quickStats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
                    onClick={() => {
                      if (i === 1) navigateTo("deposits");
                      else if (i === 3) navigateTo("starlink");
                    }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-br shadow-sm active:scale-95 transition-transform"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-90`} />
                    <div className="relative p-2.5 text-center">
                      <Icon className="w-4 h-4 text-white/80 mx-auto mb-1" />
                      <p className="text-white text-sm font-black leading-none">
                        {stat.value > 9999 ? `${(stat.value / 1000).toFixed(0)}K` : stat.value.toLocaleString("ar-YE")}
                      </p>
                      <p className="text-white/70 text-[8px] font-semibold mt-0.5">{stat.label}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Content Area ─── */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="p-4"
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ─── Professional Bottom Navigation Bar ─── */}
        <nav className="flex-shrink-0 bg-white dark:bg-[#111827] border-t border-slate-200 dark:border-slate-800 safe-area-bottom">
          <div className="flex items-center justify-around h-14 max-w-md mx-auto">
            {[
              { id: "dashboard", icon: Home, label: isAr ? "الرئيسية" : "Home" },
              { id: "users", icon: Users, label: isAr ? "المستخدمين" : "Users", role: "admin" },
              { id: "cards", icon: CreditCard, label: isAr ? "البطاقات" : "Cards" },
              { id: "notifications", icon: Bell, label: isAr ? "الإشعارات" : "Alerts", badge: notifCount },
              { id: "settings", icon: SettingsIcon, label: isAr ? "الإعدادات" : "Settings" },
            ]
              .filter(item => !item.role || item.role === userRole)
              .map(item => {
                const isActive = activeSection === item.id ||
                  (item.id === "dashboard" && ["dashboard", "dashboard-stats", "activity"].includes(activeSection)) ||
                  (item.id === "cards" && ["cards", "tiers"].includes(activeSection)) ||
                  (item.id === "notifications" && activeSection === "notifications");
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(item.id)}
                    className="relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="bottomNavIndicator"
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-emerald-500 rounded-b-full"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <Icon className={`w-[18px] h-[18px] transition-colors ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`} />
                    <span className={`text-[9px] font-semibold transition-colors ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                      {item.label}
                    </span>
                    {item.badge && item.badge > 0 && (
                      <span className="absolute top-1 left-1/2 ml-2 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-red-500 text-white text-[7px] font-bold px-0.5">
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </nav>
      </main>
    </div>
  );
}
