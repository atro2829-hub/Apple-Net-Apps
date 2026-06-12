"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  Search,
  CreditCard,
  Wifi,
  Zap,
  ChevronRight,
  Check,
  Bookmark,
  Smartphone,
  Wallet,
  AlertCircle,
  Tag,
  Clock,
  Signal,
  FolderOpen,
  Image as ImageIcon,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { ref, onValue, get, runTransaction, push, update } from "firebase/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import type { User } from "firebase/auth";

/* ────────────────────────────── Data Types ────────────────────────────── */

interface TelecomPackage {
  id: string;
  name: string;
  nameEn: string;
  price: number;
  description: string;
  descriptionEn: string;
  dataAmount?: string;
  duration?: number;
  durationUnit?: string;
  type: "recharge" | "internet" | "voice";
  isActive: boolean;
  subCategory?: string;
  iconUrl?: string;
}

interface TelecomNetwork {
  id: string;
  name: string;
  nameEn: string;
  color: string;
  bgColor: string;
  iconUrl: string;
  prefixes: string[];
  isActive: boolean;
  providerId?: string;
}

interface SubCategory {
  id: string;
  name: string;
  nameEn: string;
  networkId: string;
  iconUrl?: string;
  order?: number;
}

/* ────────────────────────────── Network Prefix Detection ────────────────────────────── */

const YEMEN_NETWORKS_MAP: Record<string, Omit<TelecomNetwork, "id" | "prefixes" | "isActive" | "providerId">> = {
  sabafon: { name: "سبافون", nameEn: "Sabafon", color: "#6B21A8", bgColor: "#F3E8FF", iconUrl: "/uploads/sabafon.png" },
  you: { name: "يو", nameEn: "YOU", color: "#CA8A04", bgColor: "#FEF9C3", iconUrl: "/uploads/you.png" },
  mtn: { name: "MTN", nameEn: "MTN", color: "#DC2626", bgColor: "#FEE2E2", iconUrl: "/uploads/mtn.png" },
  yemenMobile: { name: "يمن موبايل", nameEn: "Yemen Mobile", color: "#2563EB", bgColor: "#DBEAFE", iconUrl: "/uploads/yemenmobile.png" },
};

const DEFAULT_NETWORKS: TelecomNetwork[] = [
  { id: "sabafon", ...YEMEN_NETWORKS_MAP.sabafon, prefixes: ["71", "70"], isActive: true },
  { id: "you", ...YEMEN_NETWORKS_MAP.you, prefixes: ["73", "77"], isActive: true },
  { id: "mtn", ...YEMEN_NETWORKS_MAP.mtn, prefixes: ["78"], isActive: true },
  { id: "yemenMobile", ...YEMEN_NETWORKS_MAP.yemenMobile, prefixes: ["700", "701", "702", "703", "704", "705"], isActive: true },
];

const DEFAULT_SUB_CATEGORIES: SubCategory[] = [
  { id: "sab-south", name: "باقات سبافون جنوب", nameEn: "Sabafon South", networkId: "sabafon", order: 1 },
  { id: "sab-aden", name: "باقات سبافون عدن", nameEn: "Sabafon Aden", networkId: "sabafon", order: 2 },
  { id: "sab-all", name: "باقات سبافون عامة", nameEn: "Sabafon General", networkId: "sabafon", order: 3 },
  { id: "you-all", name: "باقات يو", nameEn: "YOU Packages", networkId: "you", order: 1 },
  { id: "mtn-all", name: "باقات MTN", nameEn: "MTN Packages", networkId: "mtn", order: 1 },
  { id: "ym-all", name: "باقات يمن موبايل", nameEn: "Yemen Mobile Packages", networkId: "yemenMobile", order: 1 },
];

const DEFAULT_PACKAGES: Record<string, TelecomPackage[]> = {
  sabafon: [
    { id: "sab-1", name: "شحن 500 ريال", nameEn: "Recharge 500 YER", price: 500, description: "شحن رصيد فوري 500 ريال", descriptionEn: "Instant recharge 500 YER", type: "recharge", isActive: true, subCategory: "sab-south" },
    { id: "sab-2", name: "شحن 1000 ريال", nameEn: "Recharge 1000 YER", price: 1000, description: "شحن رصيد فوري 1000 ريال", descriptionEn: "Instant recharge 1000 YER", type: "recharge", isActive: true, subCategory: "sab-aden" },
    { id: "sab-3", name: "باقة 1 جيجا", nameEn: "1 GB Package", price: 800, description: "باقة إنترنت 1 جيجابايت - يومين", descriptionEn: "1 GB Internet - 2 days", dataAmount: "1GB", duration: 2, durationUnit: "يوم", type: "internet", isActive: true, subCategory: "sab-south" },
    { id: "sab-4", name: "باقة 3 جيجا", nameEn: "3 GB Package", price: 2000, description: "باقة إنترنت 3 جيجابايت - أسبوع", descriptionEn: "3 GB Internet - 1 week", dataAmount: "3GB", duration: 7, durationUnit: "يوم", type: "internet", isActive: true, subCategory: "sab-aden" },
    { id: "sab-5", name: "باقة مكالمات 60 دقيقة", nameEn: "60 Min Calls", price: 600, description: "60 دقيقة مكالمات - 3 أيام", descriptionEn: "60 minutes calls - 3 days", duration: 3, durationUnit: "يوم", type: "voice", isActive: true, subCategory: "sab-all" },
  ],
  you: [
    { id: "you-1", name: "شحن 500 ريال", nameEn: "Recharge 500 YER", price: 500, description: "شحن رصيد فوري 500 ريال", descriptionEn: "Instant recharge 500 YER", type: "recharge", isActive: true, subCategory: "you-all" },
    { id: "you-2", name: "شحن 1000 ريال", nameEn: "Recharge 1000 YER", price: 1000, description: "شحن رصيد فوري 1000 ريال", descriptionEn: "Instant recharge 1000 YER", type: "recharge", isActive: true, subCategory: "you-all" },
    { id: "you-3", name: "باقة 2 جيجا", nameEn: "2 GB Package", price: 1200, description: "باقة إنترنت 2 جيجابايت - 3 أيام", descriptionEn: "2 GB Internet - 3 days", dataAmount: "2GB", duration: 3, durationUnit: "يوم", type: "internet", isActive: true, subCategory: "you-all" },
    { id: "you-4", name: "باقة 5 جيجا", nameEn: "5 GB Package", price: 3000, description: "باقة إنترنت 5 جيجابايت - أسبوع", descriptionEn: "5 GB Internet - 1 week", dataAmount: "5GB", duration: 7, durationUnit: "يوم", type: "internet", isActive: true, subCategory: "you-all" },
    { id: "you-5", name: "باقة مكالمات 120 دقيقة", nameEn: "120 Min Calls", price: 1000, description: "120 دقيقة مكالمات - أسبوع", descriptionEn: "120 minutes calls - 1 week", duration: 7, durationUnit: "يوم", type: "voice", isActive: true, subCategory: "you-all" },
  ],
  mtn: [
    { id: "mtn-1", name: "شحن 500 ريال", nameEn: "Recharge 500 YER", price: 500, description: "شحن رصيد فوري 500 ريال", descriptionEn: "Instant recharge 500 YER", type: "recharge", isActive: true, subCategory: "mtn-all" },
    { id: "mtn-2", name: "شحن 2000 ريال", nameEn: "Recharge 2000 YER", price: 2000, description: "شحن رصيد فوري 2000 ريال", descriptionEn: "Instant recharge 2000 YER", type: "recharge", isActive: true, subCategory: "mtn-all" },
    { id: "mtn-3", name: "باقة 1.5 جيجا", nameEn: "1.5 GB Package", price: 1000, description: "باقة إنترنت 1.5 جيجابايت - يومين", descriptionEn: "1.5 GB Internet - 2 days", dataAmount: "1.5GB", duration: 2, durationUnit: "يوم", type: "internet", isActive: true, subCategory: "mtn-all" },
    { id: "mtn-4", name: "باقة مكالمات 90 دقيقة", nameEn: "90 Min Calls", price: 800, description: "90 دقيقة مكالمات - 3 أيام", descriptionEn: "90 minutes calls - 3 days", duration: 3, durationUnit: "يوم", type: "voice", isActive: true, subCategory: "mtn-all" },
  ],
  yemenMobile: [
    { id: "ym-1", name: "شحن 500 ريال", nameEn: "Recharge 500 YER", price: 500, description: "شحن رصيد فوري 500 ريال", descriptionEn: "Instant recharge 500 YER", type: "recharge", isActive: true, subCategory: "ym-all" },
    { id: "ym-2", name: "شحن 1000 ريال", nameEn: "Recharge 1000 YER", price: 1000, description: "شحن رصيد فوري 1000 ريال", descriptionEn: "Instant recharge 1000 YER", type: "recharge", isActive: true, subCategory: "ym-all" },
    { id: "ym-3", name: "باقة 2 جيجا", nameEn: "2 GB Package", price: 1500, description: "باقة إنترنت 2 جيجابايت - 3 أيام", descriptionEn: "2 GB Internet - 3 days", dataAmount: "2GB", duration: 3, durationUnit: "يوم", type: "internet", isActive: true, subCategory: "ym-all" },
    { id: "ym-4", name: "باقة 10 جيجا", nameEn: "10 GB Package", price: 5000, description: "باقة إنترنت 10 جيجابايت - شهر", descriptionEn: "10 GB Internet - 1 month", dataAmount: "10GB", duration: 30, durationUnit: "يوم", type: "internet", isActive: true, subCategory: "ym-all" },
    { id: "ym-5", name: "باقة مكالمات 200 دقيقة", nameEn: "200 Min Calls", price: 1500, description: "200 دقيقة مكالمات - أسبوع", descriptionEn: "200 minutes calls - 1 week", duration: 7, durationUnit: "يوم", type: "voice", isActive: true, subCategory: "ym-all" },
  ],
};

/* ────────────────────────────── Helper ────────────────────────────── */

function detectNetwork(phone: string, networks: TelecomNetwork[]): TelecomNetwork | null {
  const cleaned = phone.replace(/\D/g, "");
  if (!cleaned.startsWith("7") || cleaned.length < 2) return null;

  const after7 = cleaned.slice(1);
  if (!after7) return null;

  for (const net of networks) {
    if (!net.prefixes || !net.isActive) continue;
    for (const prefix of net.prefixes) {
      const fullPrefix = "7" + prefix;
      if (cleaned.startsWith(fullPrefix)) return net;
    }
  }
  return null;
}

/* ────────────────────────────── Service Tabs ────────────────────────────── */

type ServiceTab = "recharge" | "internet" | "voice";

const SERVICE_TABS: { id: ServiceTab; labelAr: string; labelEn: string; icon: React.ElementType }[] = [
  { id: "recharge", labelAr: "شحن فوري", labelEn: "Instant Recharge", icon: Zap },
  { id: "internet", labelAr: "باقات إنترنت", labelEn: "Internet Packages", icon: Wifi },
  { id: "voice", labelAr: "باقات مكالمات", labelEn: "Call Packages", icon: Phone },
];

/* ────────────────────────────── Network Icon Component ────────────────────────────── */

function NetworkIcon({ network, size = 56, active = false }: { network: TelecomNetwork; size?: number; active?: boolean }) {
  const iconSize = Math.round(size * 0.55);
  return (
    <div
      className="rounded-2xl flex items-center justify-center overflow-hidden transition-all duration-200"
      style={{
        width: size,
        height: size,
        backgroundColor: active ? network.color : network.bgColor,
        boxShadow: active ? `0 4px 14px ${network.color}40` : "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      {network.iconUrl ? (
        <img
          src={network.iconUrl}
          alt={network.nameEn}
          className="object-contain"
          style={{ width: iconSize, height: iconSize }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
            (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
          }}
        />
      ) : null}
      <div className={`flex items-center justify-center ${network.iconUrl ? "hidden" : ""}`} style={{ width: iconSize, height: iconSize }}>
        <Signal className="w-full h-full p-1" style={{ color: active ? "#fff" : network.color }} />
      </div>
    </div>
  );
}

/* ────────────────────────────── Package Icon Component ────────────────────────────── */

function PackageIcon({ pkg, selected }: { pkg: TelecomPackage; selected: boolean }) {
  return (
    <div
      className={`flex-shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center overflow-hidden relative ${selected ? "bg-white/20" : ""}`}
      style={!selected ? { backgroundColor: "#FEF3C7" } : {}}
    >
      {pkg.iconUrl ? (
        <img
          src={pkg.iconUrl}
          alt={pkg.nameEn}
          className="w-8 h-8 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <>
          <span className={`text-sm font-black ${selected ? "text-white" : "text-yellow-900"}`}>
            {pkg.price}
          </span>
          <span className={`text-[9px] font-bold ${selected ? "text-white/80" : "text-yellow-800"}`}>
            ريال
          </span>
        </>
      )}
      {!pkg.iconUrl && selected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-black text-white">{pkg.price}</span>
          <span className="text-[9px] font-bold text-white/80">ريال</span>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────── Main Component ────────────────────────────── */

interface TelecomRechargePageProps {
  user: User | null;
  onAuthClick: () => void;
  onNavigate?: (tab: string) => void;
  onExecute?: (data: { phoneNumber: string; packageId: string; networkId: string; amount: number }) => void;
}

export function TelecomRechargePage({ user, onAuthClick, onNavigate, onExecute }: TelecomRechargePageProps) {
  const { t, isRTL, lang } = useLanguage();
  const isAr = lang === "ar";

  const [phoneNumber, setPhoneNumber] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("applenet_telecom_phone") || "";
    }
    return "";
  });
  const [selectedTab, setSelectedTab] = useState<ServiceTab>("recharge");
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [saveNumber, setSaveNumber] = useState(() => {
    if (typeof window !== "undefined") {
      return !!localStorage.getItem("applenet_telecom_phone");
    }
    return false;
  });
  const [packages, setPackages] = useState<Record<string, TelecomPackage[]>>(DEFAULT_PACKAGES);
  const [networks, setNetworks] = useState<TelecomNetwork[]>(DEFAULT_NETWORKS);
  const [subCategories, setSubCategories] = useState<SubCategory[]>(DEFAULT_SUB_CATEGORIES);
  const [balance, setBalance] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Detect network from phone number
  const detectedNetwork = useMemo(() => detectNetwork(phoneNumber, networks), [phoneNumber, networks]);
  const activeNetworkId = selectedNetwork || detectedNetwork?.id || null;

  // Get active network object
  const activeNetwork = useMemo(() => networks.find(n => n.id === activeNetworkId), [networks, activeNetworkId]);

  // Get sub-categories for active network
  const networkSubCategories = useMemo(() => {
    if (!activeNetworkId) return [];
    return subCategories
      .filter(sc => sc.networkId === activeNetworkId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [activeNetworkId, subCategories]);

  // Save phone number when toggled
  useEffect(() => {
    if (saveNumber && phoneNumber) {
      localStorage.setItem("applenet_telecom_phone", phoneNumber);
    } else {
      localStorage.removeItem("applenet_telecom_phone");
    }
  }, [saveNumber, phoneNumber]);

  // Load user balance
  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(db, `credit/${user.uid}/amount`), (snap) => {
      setBalance(snap.val() || 0);
    });
    return () => unsub();
  }, [user]);

  // Load networks from Firebase
  useEffect(() => {
    const unsub = onValue(ref(db, "telecomNetworks"), (snap) => {
      const data = snap.val();
      if (data) {
        const loaded: TelecomNetwork[] = Object.entries(data)
          .map(([id, val]: [string, unknown]) => ({ id, ...(val as Record<string, unknown>) }))
          .filter((n: Record<string, unknown>) => n.isActive) as TelecomNetwork[];
        if (loaded.length > 0) setNetworks(loaded);
      }
    });
    return () => unsub();
  }, []);

  // Load packages from Firebase
  useEffect(() => {
    const unsub = onValue(ref(db, "telecomPackages"), (snap) => {
      const data = snap.val();
      if (data) {
        const loaded: Record<string, TelecomPackage[]> = {};
        Object.entries(data).forEach(([networkId, netPkgs]: [string, unknown]) => {
          if (netPkgs && typeof netPkgs === "object") {
            const pkgList = Object.entries(netPkgs as Record<string, unknown>)
              .map(([id, val]: [string, unknown]) => ({ id, ...(val as Record<string, unknown>) }))
              .filter((p: Record<string, unknown>) => p.isActive) as TelecomPackage[];
            if (pkgList.length > 0) loaded[networkId] = pkgList;
          }
        });
        if (Object.keys(loaded).length > 0) setPackages(loaded);
      }
    });
    return () => unsub();
  }, []);

  // Load sub-categories from Firebase
  useEffect(() => {
    const unsub = onValue(ref(db, "telecomSubCategories"), (snap) => {
      const data = snap.val();
      if (data) {
        const loaded: SubCategory[] = Object.entries(data)
          .map(([id, val]: [string, unknown]) => ({ id, ...(val as Record<string, unknown>) }))
          .sort((a: SubCategory, b: SubCategory) => (a.order || 0) - (b.order || 0));
        if (loaded.length > 0) setSubCategories(loaded);
      }
    });
    return () => unsub();
  }, []);

  // Filter packages by network, tab, and sub-category
  const filteredPackages = useMemo(() => {
    if (!activeNetworkId) return [];
    const netPkgs = packages[activeNetworkId] || [];
    return netPkgs.filter((p) => {
      const tabMatch = p.type === selectedTab;
      const subCatMatch = !selectedSubCategory || p.subCategory === selectedSubCategory;
      return tabMatch && subCatMatch;
    });
  }, [activeNetworkId, packages, selectedTab, selectedSubCategory]);

  // Reset selections when tab or network changes
  const handleTabChange = (tab: ServiceTab) => {
    setSelectedTab(tab);
    setSelectedPackage(null);
    setSelectedSubCategory(null);
  };

  const handleNetworkClick = (networkId: string) => {
    setSelectedNetwork((prev) => (prev === networkId ? null : networkId));
    setSelectedPackage(null);
    setSelectedSubCategory(null);
  };

  const handleSubCategoryClick = (subCatId: string) => {
    setSelectedSubCategory((prev) => (prev === subCatId ? null : subCatId));
    setSelectedPackage(null);
  };

  // Purchase with balance deduction from in-app balance
  const handleBuy = useCallback(async () => {
    if (!phoneNumber || phoneNumber.replace(/\D/g, "").length < 9) {
      toast.error(isAr ? "أدخل رقم هاتف صحيح" : "Enter a valid phone number");
      return;
    }
    if (!selectedPackage) {
      toast.error(isAr ? "اختر باقة أولاً" : "Select a package first");
      return;
    }
    if (!user) {
      onAuthClick();
      return;
    }

    const pkg = filteredPackages.find((p) => p.id === selectedPackage);
    if (!pkg) return;

    // Check balance
    if (balance < pkg.price) {
      toast.error(isAr ? `رصيدك غير كافي. رصيدك الحالي: ${balance} ريال` : `Insufficient balance. Current: ${balance} YER`);
      return;
    }

    setIsProcessing(true);

    try {
      // Deduct from user's in-app balance via Firebase RTDB (atomic transaction)
      // API only provides the service - balance is always from the app wallet
      const balanceRef = ref(db, `credit/${user.uid}/amount`);
      const newBalance = await runTransaction(balanceRef, (current) => {
        if ((current || 0) < pkg.price) return; // abort transaction - insufficient balance
        return (current || 0) - pkg.price;
      });

      if (newBalance.committed) {
        // Add purchase history entry
        const historyRef = push(ref(db, `credit/${user.uid}/history`));
        await update(historyRef, {
          type: "purchase",
          amount: pkg.price,
          description: `سداد اتصالات - ${activeNetwork?.name || ""} - ${pkg.name}`,
          descriptionEn: `Telecom Payment - ${activeNetwork?.nameEn || ""} - ${pkg.nameEn}`,
          timestamp: Date.now(),
          phoneNumber: phoneNumber.replace(/\D/g, ""),
          packageId: selectedPackage,
          networkId: activeNetworkId,
        });

        // Create telecom order for admin to process
        const orderRef = push(ref(db, "telecomOrders"));
        await update(orderRef, {
          uid: user.uid,
          phoneNumber: phoneNumber.replace(/\D/g, ""),
          packageId: selectedPackage,
          networkId: activeNetworkId,
          amount: pkg.price,
          status: "pending",
          createdAt: Date.now(),
          packageName: pkg.name,
          packageNameEn: pkg.nameEn,
          networkName: activeNetwork?.name,
          networkNameEn: activeNetwork?.nameEn,
          userName: user.displayName || "",
          userEmail: user.email || "",
        });

        // Send notification to admin about new order
        const adminNotifRef = push(ref(db, "adminNotifications"));
        await update(adminNotifRef, {
          type: "telecom_order",
          title: "طلب سداد اتصالات جديد",
          titleEn: "New Telecom Order",
          body: `${user.displayName || "مستخدم"} - ${activeNetwork?.name || ""} - ${pkg.name} - ${pkg.price} ريال`,
          bodyEn: `${user.displayName || "User"} - ${activeNetwork?.nameEn || ""} - ${pkg.nameEn} - ${pkg.price} YER`,
          orderId: orderRef.key,
          uid: user.uid,
          timestamp: Date.now(),
          read: false,
        });

        toast.success(isAr ? "تم الشراء بنجاح! سيتم تنفيذ الطلب عبر مزود الخدمة" : "Purchase successful! Order will be processed by the provider");

        // If onExecute prop is provided, call it to trigger external API provider
        if (onExecute) {
          onExecute({
            phoneNumber: phoneNumber.replace(/\D/g, ""),
            packageId: selectedPackage,
            networkId: activeNetworkId || "",
            amount: pkg.price,
          });
        }

        setSelectedPackage(null);
      } else {
        toast.error(isAr ? "رصيدك غير كافي" : "Insufficient balance");
      }
    } catch {
      toast.error(isAr ? "حدث خطأ، حاول مرة أخرى" : "An error occurred, try again");
    } finally {
      setIsProcessing(false);
    }
  }, [phoneNumber, selectedPackage, filteredPackages, activeNetworkId, activeNetwork, balance, user, onAuthClick, onExecute, isAr, db]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d]/g, "");
    if (val.length <= 10) setPhoneNumber(val);
  };

  const selectedPkg = filteredPackages.find(p => p.id === selectedPackage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 14 }}
      className="px-3 sm:px-4 pt-3 pb-4 max-w-lg mx-auto"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* ── Header with Balance ── */}
      <div className="bg-gradient-to-br from-[#1B7A3D] to-[#22A24D] rounded-2xl p-4 sm:p-5 mb-4 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-20 h-20 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black">{isAr ? "سداد الاتصالات" : "Telecom Recharge"}</h2>
              <p className="text-xs sm:text-sm text-white/80">{isAr ? "شحن رصيد وباقات جميع الشبكات" : "Recharge & packages for all networks"}</p>
            </div>
          </div>
          {/* Balance display */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-white/90" />
              <span className="text-sm text-white/80 font-semibold">{isAr ? "رصيدك" : "Your Balance"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black">{balance.toLocaleString()}</span>
              <span className="text-xs text-white/70">{isAr ? "ريال" : "YER"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Network Logos Grid ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl card-shadow p-3 sm:p-4 mb-4">
        <h3 className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
          <Signal className="w-3.5 h-3.5" />
          {isAr ? "اختر الشبكة" : "Select Network"}
        </h3>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {networks.map((net) => {
            const isActive = activeNetworkId === net.id;
            return (
              <motion.button
                key={net.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleNetworkClick(net.id)}
                className={`flex flex-col items-center gap-1.5 transition-all duration-200 ${isActive ? "scale-105" : "opacity-60 hover:opacity-90"}`}
              >
                <NetworkIcon network={net} size={52} active={isActive} />
                <span className={`text-[10px] font-bold text-center leading-tight ${isActive ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-slate-500"}`}>
                  {isAr ? net.name : net.nameEn}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Phone Input with Network Detection ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl card-shadow p-3 sm:p-4 mb-4">
        <div className="relative">
          <div className="absolute top-1/2 -translate-y-1/2 start-3 z-10">
            <Phone className="w-5 h-5 text-gray-400" />
          </div>
          <Input
            value={phoneNumber}
            onChange={handlePhoneChange}
            placeholder={isAr ? "7XXXXXXXX" : "7XXXXXXXX"}
            dir="ltr"
            className="ps-10 pe-24 h-12 text-lg font-mono rounded-xl border-2 focus:border-[#1B7A3D] transition-colors dark:bg-slate-700 dark:text-white dark:border-slate-600"
            maxLength={10}
          />
          {/* Dynamic network badge */}
          <AnimatePresence mode="wait">
            {(detectedNetwork || (selectedNetwork && networks.find((n) => n.id === selectedNetwork))) && (
              <motion.div
                key={activeNetworkId}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute top-1/2 -translate-y-1/2 end-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                style={{
                  backgroundColor: (detectedNetwork || networks.find((n) => n.id === selectedNetwork))!.bgColor,
                }}
              >
                {(detectedNetwork || networks.find((n) => n.id === selectedNetwork))!.iconUrl && (
                  <img
                    src={(detectedNetwork || networks.find((n) => n.id === selectedNetwork))!.iconUrl}
                    alt=""
                    className="w-4 h-4 object-contain"
                  />
                )}
                <span
                  className="text-[11px] font-bold"
                  style={{ color: (detectedNetwork || networks.find((n) => n.id === selectedNetwork))!.color }}
                >
                  {isAr
                    ? (detectedNetwork || networks.find((n) => n.id === selectedNetwork))!.name
                    : (detectedNetwork || networks.find((n) => n.id === selectedNetwork))!.nameEn}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Save number checkbox */}
        <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
          <div
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
              saveNumber ? "bg-[#1B7A3D] border-[#1B7A3D]" : "border-gray-300 bg-white dark:border-slate-500"
            }`}
            onClick={() => setSaveNumber(!saveNumber)}
          >
            {saveNumber && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className="text-xs text-gray-500 dark:text-slate-400">{isAr ? "حفظ الرقم للمرة القادمة" : "Save number for next time"}</span>
        </label>
      </div>

      {/* ── Service Tabs ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl card-shadow p-2.5 sm:p-3 mb-4">
        <div className="flex gap-2">
          {SERVICE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-br from-[#1B7A3D] to-[#22A24D] text-white shadow-md"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{isAr ? tab.labelAr : tab.labelEn}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Sub-Categories (if network has them) ── */}
      {networkSubCategories.length > 1 && activeNetworkId && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl card-shadow p-3 mb-4">
          <h3 className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5" />
            {isAr ? "الأقسام الفرعية" : "Sub-Categories"}
          </h3>
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedSubCategory(null)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                !selectedSubCategory
                  ? "bg-[#1B7A3D] text-white shadow-sm"
                  : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              {isAr ? "الكل" : "All"}
            </motion.button>
            {networkSubCategories.map((sc) => (
              <motion.button
                key={sc.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSubCategoryClick(sc.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedSubCategory === sc.id
                    ? "bg-[#1B7A3D] text-white shadow-sm"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
                }`}
              >
                {sc.iconUrl && <img src={sc.iconUrl} alt="" className="w-4 h-4 object-contain" />}
                {isAr ? sc.name : sc.nameEn}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* ── Package List ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl card-shadow p-3 sm:p-4 mb-4">
        <h3 className="text-sm font-bold text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#1B7A3D]" />
          {selectedTab === "recharge" && (isAr ? "شحن رصيد فوري" : "Instant Recharge")}
          {selectedTab === "internet" && (isAr ? "باقات الإنترنت" : "Internet Packages")}
          {selectedTab === "voice" && (isAr ? "باقات المكالمات" : "Call Packages")}
        </h3>

        <div className="max-h-80 overflow-y-auto space-y-2 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {filteredPackages.length > 0 ? (
              filteredPackages.map((pkg) => {
                const isSelected = selectedPackage === pkg.id;
                return (
                  <motion.button
                    key={pkg.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    onClick={() => setSelectedPackage(isSelected ? null : pkg.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                      isSelected
                        ? "bg-gradient-to-l from-[#1B7A3D] to-[#22A24D] text-white shadow-lg"
                        : "bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-[0.98]"
                    }`}
                  >
                    {/* Package Icon or Price badge */}
                    <PackageIcon pkg={pkg} selected={isSelected} />

                    {/* Package info */}
                    <div className="flex-1 text-start min-w-0">
                      <p className={`text-sm font-bold truncate ${isSelected ? "text-white" : "text-gray-900 dark:text-white"}`}>
                        {isAr ? pkg.name : pkg.nameEn}
                      </p>
                      <p className={`text-xs truncate ${isSelected ? "text-white/80" : "text-gray-500 dark:text-slate-400"}`}>
                        {isAr ? pkg.description : pkg.descriptionEn}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {pkg.dataAmount && (
                          <Badge variant="outline" className={`text-[9px] py-0 px-1.5 ${isSelected ? "border-white/30 text-white/80" : "border-gray-200 dark:border-slate-600 text-gray-400"}`}>
                            {pkg.dataAmount}
                          </Badge>
                        )}
                        {pkg.duration && (
                          <span className={`text-[10px] flex items-center gap-0.5 ${isSelected ? "text-white/70" : "text-gray-400"}`}>
                            <Clock className="w-3 h-3" />
                            {pkg.duration} {pkg.durationUnit || (isAr ? "يوم" : "days")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-end flex-shrink-0">
                      <span className={`text-sm font-black ${isSelected ? "text-white" : "text-[#1B7A3D]"}`}>
                        {pkg.price.toLocaleString()}
                      </span>
                      <p className={`text-[9px] font-semibold ${isSelected ? "text-white/70" : "text-gray-400"}`}>
                        {isAr ? "ريال" : "YER"}
                      </p>
                    </div>

                    {/* Check icon for selected */}
                    {isSelected && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                        <div className="w-7 h-7 rounded-full bg-white/30 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      </motion.div>
                    )}
                  </motion.button>
                );
              })
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-8 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center mb-3">
                  <Search className="w-8 h-8 text-gray-300 dark:text-slate-500" />
                </div>
                <p className="text-sm text-gray-400 dark:text-slate-500 font-bold">
                  {activeNetworkId
                    ? isAr
                      ? "لا توجد باقات متاحة"
                      : "No packages available"
                    : isAr
                      ? "أدخل رقم الهاتف أو اختر شبكة"
                      : "Enter phone number or select a network"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Insufficient Balance Warning ── */}
      {selectedPkg && balance < selectedPkg.price && user && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl p-3 mb-3 flex items-center gap-2"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-red-600 dark:text-red-400">
              {isAr ? "رصيدك غير كافي" : "Insufficient Balance"}
            </p>
            <p className="text-[11px] text-red-500/70 dark:text-red-400/70">
              {isAr
                ? `تحتاج ${selectedPkg.price.toLocaleString()} ريال ورصيدك ${balance.toLocaleString()} ريال`
                : `You need ${selectedPkg.price.toLocaleString()} YER but have ${balance.toLocaleString()} YER`}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => onNavigate?.("deposit")}
            className="ms-auto bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg px-3"
          >
            {isAr ? "شحن" : "Top Up"}
          </Button>
        </motion.div>
      )}

      {/* ── Buy Button ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Button
          onClick={handleBuy}
          disabled={!selectedPackage || !phoneNumber || isProcessing}
          className="w-full h-13 text-base font-black rounded-2xl bg-gradient-to-l from-[#1B7A3D] to-[#22A24D] hover:from-[#166B34] hover:to-[#1E9444] text-white shadow-lg shadow-green-200 disabled:opacity-40 disabled:shadow-none transition-all duration-200"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {isAr ? "جاري المعالجة..." : "Processing..."}
            </span>
          ) : (
            <>
              <Bookmark className="w-5 h-5 me-2" />
              {isAr ? "شراء من الرصيد" : "Buy from Balance"}
              {selectedPkg && (
                <span className="ms-2 opacity-80">
                  — {selectedPkg.price.toLocaleString()} {isAr ? "ريال" : "YER"}
                </span>
              )}
            </>
          )}
        </Button>
      </motion.div>

      {/* ── Info Note ── */}
      <p className="text-center text-[10px] text-gray-400 dark:text-slate-500 mt-3 px-4">
        {isAr
          ? "سيتم خصم المبلغ من رصيدك في التطبيق وتنفيذ الطلب عبر مزود الخدمة"
          : "Amount will be deducted from your app balance and processed via the service provider"}
      </p>
    </motion.div>
  );
}
