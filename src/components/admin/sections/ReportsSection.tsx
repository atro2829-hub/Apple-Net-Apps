"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import { ref, get, onValue } from "firebase/database";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  FileText, Users as UsersIcon, CreditCard, Receipt,
  Banknote, Download, RefreshCw, BarChart3
} from "lucide-react";

// ─── PDF Save Helper ────────────────────────────────────
async function savePdfToDevice(pdfBytes: Uint8Array, filename: string): Promise<string> {
  try {
    if (typeof window !== "undefined" && "Capacitor" in window) {
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      const base64Data = btoa(String.fromCharCode(...pdfBytes));
      const result = await Filesystem.writeFile({
        path: `Download/${filename}`,
        data: base64Data,
        directory: Directory.ExternalStorage,
        recursive: true,
      });
      return result.uri;
    }
  } catch { /* fallback */ }
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  return filename;
}

interface ReportConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  fetchAndGenerate: () => Promise<void>;
}

export function ReportsSection() {
  const [generating, setGenerating] = useState<string | null>(null);

  const generateReport = async (config: ReportConfig) => {
    setGenerating(config.id);
    try {
      await config.fetchAndGenerate();
    } catch (err) {
      toast.error("حدث خطأ أثناء إنشاء التقرير");
    }
    setGenerating(null);
  };

  const fetchUsersAndGenerate = async () => {
    const snap = await get(ref(db, "users"));
    const users = snap.val() || {};
    const rows = Object.entries(users).map(([uid, u]: [string, any]) => [
      u.name || u.displayName || "—",
      u.phone || uid,
      u.balance || 0,
      u.role || "user",
      u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—",
    ]);

    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Apple.NET - Users Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Total Users: ${rows.length} | Generated: ${new Date().toLocaleString()}`, 14, 28);
    autoTable(doc, {
      head: [["Name", "Phone/ID", "Balance", "Role", "Joined"]],
      body: rows,
      startY: 36,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] },
    });
    const pdfBytes = new Uint8Array(doc.output("arraybuffer"));
    const path = await savePdfToDevice(pdfBytes, `users-report-${Date.now()}.pdf`);
    toast.success(`تم حفظ التقرير في: ${path}`);
  };

  const fetchCardsAndGenerate = async () => {
    const snap = await get(ref(db, "cards"));
    const cards = snap.val() || {};
    const rows = Object.entries(cards).map(([id, c]: [string, any]) => [
      c.networkId || c.network || "—",
      c.tier || c.amount || "—",
      c.price || 0,
      c.status === "available" ? "متاح" : c.status === "sold" ? "مباع" : c.status || "—",
      c.soldTo || "—",
      c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—",
    ]);

    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Apple.NET - Cards Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Total Cards: ${rows.length} | Generated: ${new Date().toLocaleString()}`, 14, 28);
    autoTable(doc, {
      head: [["Network", "Tier", "Price", "Status", "Sold To", "Created"]],
      body: rows,
      startY: 36,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] },
    });
    const pdfBytes = new Uint8Array(doc.output("arraybuffer"));
    const path = await savePdfToDevice(pdfBytes, `cards-report-${Date.now()}.pdf`);
    toast.success(`تم حفظ التقرير في: ${path}`);
  };

  const fetchDepositsAndGenerate = async () => {
    const snap = await get(ref(db, "depositRequests"));
    const deposits = snap.val() || {};
    const rows = Object.entries(deposits).map(([id, d]: [string, any]) => [
      d.userName || d.userId || "—",
      d.amount || 0,
      d.method || "—",
      d.status === "approved" ? "معتمد" : d.status === "pending" ? "قيد الانتظار" : "مرفوض",
      d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "—",
    ]);

    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Apple.NET - Deposits Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Total Deposits: ${rows.length} | Generated: ${new Date().toLocaleString()}`, 14, 28);
    autoTable(doc, {
      head: [["User", "Amount", "Method", "Status", "Date"]],
      body: rows,
      startY: 36,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] },
    });
    const pdfBytes = new Uint8Array(doc.output("arraybuffer"));
    const path = await savePdfToDevice(pdfBytes, `deposits-report-${Date.now()}.pdf`);
    toast.success(`تم حفظ التقرير في: ${path}`);
  };

  const fetchCommissionsAndGenerate = async () => {
    const snap = await get(ref(db, "commissions"));
    const commissions = snap.val() || {};
    const rows = Object.entries(commissions).map(([id, c]: [string, any]) => [
      c.networkId || c.networkName || "—",
      c.userId || c.userName || "—",
      c.amount || 0,
      c.type || "—",
      c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—",
    ]);

    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Apple.NET - Commissions Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Total Records: ${rows.length} | Generated: ${new Date().toLocaleString()}`, 14, 28);
    autoTable(doc, {
      head: [["Network", "User", "Amount", "Type", "Date"]],
      body: rows,
      startY: 36,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] },
    });
    const pdfBytes = new Uint8Array(doc.output("arraybuffer"));
    const path = await savePdfToDevice(pdfBytes, `commissions-report-${Date.now()}.pdf`);
    toast.success(`تم حفظ التقرير في: ${path}`);
  };

  const reports: ReportConfig[] = [
    {
      id: "users", title: "تقرير المستخدمين", description: "قائمة بجميع المستخدمين وأرصدتهم وأدوارهم",
      icon: UsersIcon, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30",
      fetchAndGenerate: fetchUsersAndGenerate,
    },
    {
      id: "cards", title: "تقرير البطاقات", description: "جميع البطاقات وحالتها ومبيعاتها",
      icon: CreditCard, color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      fetchAndGenerate: fetchCardsAndGenerate,
    },
    {
      id: "deposits", title: "تقرير الإيداعات", description: "جميع طلبات الإيداع وحالتها",
      icon: Receipt, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30",
      fetchAndGenerate: fetchDepositsAndGenerate,
    },
    {
      id: "commissions", title: "تقرير العمولات", description: "تفاصيل العمولات لكل شبكة ومستخدم",
      icon: Banknote, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/30",
      fetchAndGenerate: fetchCommissionsAndGenerate,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">التقارير</h2>
            <p className="text-sm text-gray-500">إنشاء تقارير PDF مفصلة</p>
          </div>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reports.map((report) => {
          const Icon = report.icon;
          const isGenerating = generating === report.id;
          return (
            <motion.div
              key={report.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-4"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${report.bgColor}`}>
                  <Icon className={`w-6 h-6 ${report.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white">{report.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                </div>
              </div>
              <Button
                onClick={() => generateReport(report)}
                disabled={generating !== null}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 ml-1 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 ml-1" />
                )}
                {isGenerating ? "جاري الإنشاء..." : "إنشاء التقرير"}
              </Button>
            </motion.div>
          );
        })}
      </div>

      {/* Stats Summary */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-emerald-500" /> ملخص سريع
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickStat label="المستخدمين" path="users" />
          <QuickStat label="البطاقات" path="cards" />
          <QuickStat label="الإيداعات" path="depositRequests" />
          <QuickStat label="العمولات" path="commissions" />
        </div>
      </div>
    </div>
  );
}

function QuickStat({ label, path }: { label: string; path: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const unsub = onValue(ref(db, path), (snap) => {
      const data = snap.val() || {};
      setCount(Object.keys(data).length);
    });
    return () => unsub();
  }, [path]);

  return (
    <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50">
      <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
        {count !== null ? count : "—"}
      </p>
      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{label}</p>
    </div>
  );
}
