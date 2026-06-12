"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import { ref, set, get, push, update, remove, onValue, runTransaction } from "firebase/database";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users, CreditCard, Receipt, Wifi, Gift, TrendingUp, TrendingDown,
  Plus, Wallet, Bell, UserCog, ArrowLeft, Activity, DollarSign,
  BarChart3, Eye, ShoppingBag, Zap
} from "lucide-react";

interface DashboardSectionProps {
  userRole: "admin" | "network_manager";
  managedNetwork?: string;
  showStats?: boolean;
}

interface MetricCard {
  icon: React.ElementType;
  value: number;
  label: string;
  color: string;
  bgColor: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

interface ActivityItem {
  id: string;
  type: "deposit" | "purchase" | "user" | "card" | "network";
  message: string;
  timestamp: number;
}

export function DashboardSection({ userRole, managedNetwork, showStats = false }: DashboardSectionProps) {
  const [greeting, setGreeting] = useState({ text: "صباح الخير", period: "صباحاً" });
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Greeting based on time of day ────────────────────
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting({ text: "صباح الخير", period: "صباحاً" });
    } else if (hour >= 12 && hour < 18) {
      setGreeting({ text: "مساء الخير", period: "مساءً" });
    } else {
      setGreeting({ text: "مساء الخير", period: "مساءً" });
    }
  }, []);

  // ─── Real-time stats ──────────────────────────────────
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    if (showStats) {
      // Total users
      const usersUnsub = onValue(ref(db, "users"), (snap) => {
        const data = snap.val() || {};
        const count = Object.keys(data).length;
        setMetrics(prev => {
          const rest = prev.filter(m => m.label !== "إجمالي المستخدمين");
          return [...rest, {
            icon: Users,
            value: count,
            label: "إجمالي المستخدمين",
            color: "text-emerald-600 dark:text-emerald-400",
            bgColor: "bg-emerald-50 dark:bg-emerald-900/30",
            trend: count > 0 ? "up" : "neutral",
            trendValue: `${count} مستخدم`
          }];
        });
      });
      unsubs.push(usersUnsub);

      // Total revenue from sold cards
      const cardsUnsub = onValue(ref(db, "cards"), (snap) => {
        const data = snap.val() || {};
        const cards = Object.values(data) as any[];
        const soldCards = cards.filter(c => c.isUsed);
        const revenue = soldCards.reduce((sum, c) => sum + (c.price || 0), 0);
        const available = cards.filter(c => !c.isUsed).length;

        setMetrics(prev => {
          const rest = prev.filter(m => m.label !== "إجمالي الإيرادات" && m.label !== "البطاقات المتاحة");
          return [...rest,
            {
              icon: DollarSign,
              value: revenue,
              label: "إجمالي الإيرادات",
              color: "text-amber-600 dark:text-amber-400",
              bgColor: "bg-amber-50 dark:bg-amber-900/30",
              trend: revenue > 0 ? "up" : "neutral",
              trendValue: `${revenue.toLocaleString("ar-YE")} ريال`
            },
            {
              icon: CreditCard,
              value: available,
              label: "البطاقات المتاحة",
              color: "text-blue-600 dark:text-blue-400",
              bgColor: "bg-blue-50 dark:bg-blue-900/30",
              trend: available > 0 ? "up" : "down",
              trendValue: `${available} بطاقة`
            }
          ];
        });
      });
      unsubs.push(cardsUnsub);

      // Pending deposits
      const depositsUnsub = onValue(ref(db, "depositRequests"), (snap) => {
        const data = snap.val() || {};
        const pending = Object.values(data).filter((d: any) => d.status === "pending").length;
        setMetrics(prev => {
          const rest = prev.filter(m => m.label !== "الإيداعات المعلقة");
          return [...rest, {
            icon: Receipt,
            value: pending,
            label: "الإيداعات المعلقة",
            color: "text-orange-600 dark:text-orange-400",
            bgColor: "bg-orange-50 dark:bg-orange-900/30",
            trend: pending > 5 ? "up" : "neutral",
            trendValue: `${pending} طلب`
          }];
        });
      });
      unsubs.push(depositsUnsub);

      // Active networks
      const networksUnsub = onValue(ref(db, "networks"), (snap) => {
        const data = snap.val() || {};
        const count = Object.keys(data).length;
        setMetrics(prev => {
          const rest = prev.filter(m => m.label !== "الشبكات النشطة");
          return [...rest, {
            icon: Wifi,
            value: count,
            label: "الشبكات النشطة",
            color: "text-purple-600 dark:text-purple-400",
            bgColor: "bg-purple-50 dark:bg-purple-900/30",
            trend: count > 0 ? "up" : "neutral",
            trendValue: `${count} شبكة`
          }];
        });
      });
      unsubs.push(networksUnsub);

      // Gift codes
      const giftsUnsub = onValue(ref(db, "redeemCodes"), (snap) => {
        const data = snap.val() || {};
        const count = Object.keys(data).length;
        setMetrics(prev => {
          const rest = prev.filter(m => m.label !== "أكواد الهدايا");
          return [...rest, {
            icon: Gift,
            value: count,
            label: "أكواد الهدايا",
            color: "text-pink-600 dark:text-pink-400",
            bgColor: "bg-pink-50 dark:bg-pink-900/30",
            trend: count > 0 ? "up" : "neutral",
            trendValue: `${count} كود`
          }];
        });
      });
      unsubs.push(giftsUnsub);
    }

    setLoading(false);
    return () => unsubs.forEach(u => u());
  }, [showStats]);

  // ─── Activity Feed ────────────────────────────────────
  useEffect(() => {
    const unsubs: (() => void)[] = [];
    const allActivities: ActivityItem[] = [];

    const updateActivities = () => {
      const sorted = allActivities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
      setActivities(sorted);
    };

    // Recent deposits
    const depUnsub = onValue(ref(db, "depositRequests"), (snap) => {
      const data = snap.val() || {};
      const items = Object.entries(data)
        .filter(([, v]: any) => v.status === "pending")
        .slice(-5)
        .map(([k, v]: any) => ({
          id: k,
          type: "deposit" as const,
          message: `طلب إيداع جديد من ${v.userName || "مستخدم"} - ${v.amount} ريال`,
          timestamp: v.createdAt || Date.now()
        }));
      const filtered = allActivities.filter(a => a.type !== "deposit");
      setActivities([...filtered, ...items].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10));
    });
    unsubs.push(depUnsub);

    // Recent users
    const usersUnsub = onValue(ref(db, "users"), (snap) => {
      const data = snap.val() || {};
      const items = Object.entries(data)
        .slice(-3)
        .map(([k, v]: any) => ({
          id: k,
          type: "user" as const,
          message: `مستخدم جديد: ${v.displayName || v.email || "مجهول"}`,
          timestamp: v.createdAt || Date.now()
        }));
      const filtered = allActivities.filter(a => a.type !== "user");
      setActivities([...filtered, ...items].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10));
    });
    unsubs.push(usersUnsub);

    return () => unsubs.forEach(u => u());
  }, []);

  // ─── Quick Actions ────────────────────────────────────
  const quickActions = [
    { icon: Plus, label: "إضافة بطاقة", color: "from-emerald-500 to-emerald-700", section: "cards" },
    { icon: Wallet, label: "إدارة الإيداعات", color: "from-amber-500 to-amber-700", section: "deposits" },
    { icon: Bell, label: "إرسال إشعار", color: "from-blue-500 to-blue-700", section: "notifications" },
    { icon: UserCog, label: "إدارة المستخدمين", color: "from-purple-500 to-purple-700", section: "users" },
  ];

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "deposit": return <Wallet className="w-4 h-4 text-amber-500" />;
      case "purchase": return <ShoppingBag className="w-4 h-4 text-emerald-500" />;
      case "user": return <Users className="w-4 h-4 text-blue-500" />;
      case "card": return <CreditCard className="w-4 h-4 text-purple-500" />;
      case "network": return <Wifi className="w-4 h-4 text-pink-500" />;
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "الآن";
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `منذ ${days} يوم`;
  };

  // ─── Stats Dashboard ──────────────────────────────────
  if (showStats) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">لوحة الإحصائيات</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              نظرة شاملة على أداء المنصة
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">مباشر</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Accent Line */}
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-emerald-400 to-emerald-600" />

                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${metric.bgColor}`}>
                    <Icon className={`w-5 h-5 ${metric.color}`} />
                  </div>
                  {metric.trend && metric.trend !== "neutral" && (
                    <div className={`flex items-center gap-1 text-xs font-semibold ${
                      metric.trend === "up" ? "text-emerald-600" : "text-red-500"
                    }`}>
                      {metric.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-2xl font-black text-gray-900 dark:text-white">
                    {metric.value.toLocaleString("ar-YE")}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{metric.label}</p>
                </div>

                {metric.trendValue && (
                  <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">{metric.trendValue}</p>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Revenue Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
              <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">نظرة عامة على الإيرادات</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">تحديث تلقائي في الوقت الحقيقي</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metrics.filter(m => m.label.includes("إيرادات") || m.label.includes("المستخدمين") || m.label.includes("المتاحة")).map(m => (
              <div key={m.label} className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800">
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">{m.label}</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">{m.value.toLocaleString("ar-YE")}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Default Dashboard (Hero + Quick Actions + Activity) ──
  return (
    <div className="space-y-6">
      {/* Hero Greeting Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-emerald-600 to-emerald-800 p-6 md:p-8 shadow-lg"
      >
        {/* Decorative Circles */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-8 -translate-y-8" />
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-4 translate-y-4" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-emerald-200" />
            <span className="text-emerald-200 text-sm font-semibold">{greeting.period}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mb-2">
            {greeting.text} 👋
          </h1>
          <p className="text-emerald-100 text-sm md:text-base max-w-md">
            {userRole === "admin"
              ? "مرحباً بك في لوحة إدارة Apple.NET. يمكنك إدارة جميع جوانب المنصة من هنا."
              : "مرحباً بك في لوحة إدارة الشبكة. يمكنك إدارة البطاقات والإيداعات من هنا."}
          </p>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">إجراءات سريعة</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toast.info(`${action.label} - قريباً`)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all"
              >
                <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} shadow-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-slate-300 text-center">{action.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Live Activity Feed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden"
      >
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-slate-800">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">النشاط المباشر</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">آخر الأنشطة على المنصة</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">مباشر</span>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {activities.length === 0 ? (
            <div className="p-8 text-center">
              <Eye className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400 dark:text-slate-500">لا يوجد نشاط حالياً</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-slate-800">
              {activities.map((activity, index) => (
                <motion.div
                  key={activity.id + index}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">{activity.message}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{formatTimeAgo(activity.timestamp)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
