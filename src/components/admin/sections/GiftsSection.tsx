"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase";
import { ref, set, get, push, update, remove, onValue } from "firebase/database";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compressImageToBase64 } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Gift, Plus, Trash2, X, Copy, Download, Loader2,
  ToggleLeft, ToggleRight, Check, FileText, Users,
  Hash, Zap, List, AlertTriangle, Search
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────
type SubView = "single" | "bulk" | "shared" | "list";

interface RedeemCode {
  id: string;
  code: string;
  amount: number;
  isRedeemed: boolean;
  redeemedBy: string;
  createdAt: number;
}

interface SharedRedeemCode {
  id: string;
  code: string;
  amount: number;
  maxRedemptions: number;
  currentRedemptions: number;
  description: string;
  isActive: boolean;
  createdAt: number;
}

// ─── PDF save utility ──────────────────────────────────
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
  } catch {}
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  return filename;
}

// ─── Code generator ────────────────────────────────────
function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "AP";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ─── Component ──────────────────────────────────────────
export function GiftsSection() {
  const [activeView, setActiveView] = useState<SubView>("single");

  // Data state
  const [redeemCodes, setRedeemCodes] = useState<RedeemCode[]>([]);
  const [sharedCodes, setSharedCodes] = useState<SharedRedeemCode[]>([]);
  const [loading, setLoading] = useState(true);

  // Single code form
  const [singleAmount, setSingleAmount] = useState("");
  const [singleSaving, setSingleSaving] = useState(false);
  const [singleGeneratedCode, setSingleGeneratedCode] = useState<string | null>(null);

  // Bulk codes form
  const [bulkCount, setBulkCount] = useState("");
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkGeneratedCodes, setBulkGeneratedCodes] = useState<string[]>([]);

  // Shared code form
  const [sharedCode, setSharedCode] = useState("");
  const [sharedAmount, setSharedAmount] = useState("");
  const [sharedMaxRedemptions, setSharedMaxRedemptions] = useState("");
  const [sharedDescription, setSharedDescription] = useState("");
  const [sharedSaving, setSharedSaving] = useState(false);

  // List sub-view
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingCode, setDeletingCode] = useState<{ type: "redeem" | "shared"; code: RedeemCode | SharedRedeemCode } | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Success modal for PDF
  const [pdfSuccessPath, setPdfSuccessPath] = useState<string | null>(null);

  // ─── Real-time listeners ────────────────────────────
  useEffect(() => {
    const unsub1 = onValue(ref(db, "redeemCodes"), (snap) => {
      const data = snap.val() || {};
      const codes: RedeemCode[] = Object.entries(data).map(([id, v]: [string, any]) => ({
        id,
        code: v.code || "",
        amount: v.amount || 0,
        isRedeemed: v.isRedeemed || false,
        redeemedBy: v.redeemedBy || "",
        createdAt: v.createdAt || 0,
      }));
      setRedeemCodes(codes.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });

    const unsub2 = onValue(ref(db, "sharedRedeemCodes"), (snap) => {
      const data = snap.val() || {};
      const codes: SharedRedeemCode[] = Object.entries(data).map(([id, v]: [string, any]) => ({
        id,
        code: v.code || "",
        amount: v.amount || 0,
        maxRedemptions: v.maxRedemptions || 0,
        currentRedemptions: v.currentRedemptions || 0,
        description: v.description || "",
        isActive: v.isActive !== false,
        createdAt: v.createdAt || 0,
      }));
      setSharedCodes(codes.sort((a, b) => b.createdAt - a.createdAt));
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  // ─── Generate single code ───────────────────────────
  const handleGenerateSingle = async () => {
    const amount = Number(singleAmount);
    if (!amount || amount <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }
    setSingleSaving(true);
    try {
      const code = generateCode();
      await push(ref(db, "redeemCodes"), {
        code,
        amount,
        isRedeemed: false,
        redeemedBy: "",
        createdAt: Date.now(),
      });
      setSingleGeneratedCode(code);
      toast.success("تم توليد الكود بنجاح");
      setSingleAmount("");
    } catch {
      toast.error("فشل توليد الكود");
    } finally {
      setSingleSaving(false);
    }
  };

  // ─── Generate bulk codes ────────────────────────────
  const handleGenerateBulk = async () => {
    const count = Number(bulkCount);
    const amount = Number(bulkAmount);
    if (!count || count <= 0 || count > 500) {
      toast.error("يرجى إدخال عدد صحيح (1-500)");
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }
    setBulkSaving(true);
    try {
      const codes: string[] = [];
      const updates: Record<string, any> = {};
      for (let i = 0; i < count; i++) {
        const code = generateCode();
        codes.push(code);
        const newRef = push(ref(db, "redeemCodes"));
        updates[`redeemCodes/${newRef.key}`] = {
          code,
          amount,
          isRedeemed: false,
          redeemedBy: "",
          createdAt: Date.now() + i,
        };
      }
      await update(ref(db), updates);
      setBulkGeneratedCodes(codes);
      toast.success(`تم توليد ${count} كود بنجاح`);
      setBulkCount("");
      setBulkAmount("");
    } catch {
      toast.error("فشل توليد الأكواد");
    } finally {
      setBulkSaving(false);
    }
  };

  // ─── Save shared code ──────────────────────────────
  const handleSaveShared = async () => {
    const amount = Number(sharedAmount);
    const maxRed = Number(sharedMaxRedemptions);
    if (!sharedCode.trim()) {
      toast.error("يرجى إدخال الكود");
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }
    if (!maxRed || maxRed <= 0) {
      toast.error("يرجى إدخال عدد مرات الاستخدام");
      return;
    }
    setSharedSaving(true);
    try {
      await push(ref(db, "sharedRedeemCodes"), {
        code: sharedCode.trim().toUpperCase(),
        amount,
        maxRedemptions: maxRed,
        currentRedemptions: 0,
        description: sharedDescription.trim(),
        isActive: true,
        createdAt: Date.now(),
      });
      toast.success("تم إضافة الكود المشترك بنجاح");
      setSharedCode("");
      setSharedAmount("");
      setSharedMaxRedemptions("");
      setSharedDescription("");
    } catch {
      toast.error("فشل إضافة الكود المشترك");
    } finally {
      setSharedSaving(false);
    }
  };

  // ─── Toggle shared code active/inactive ────────────
  const toggleSharedActive = async (code: SharedRedeemCode) => {
    try {
      await update(ref(db, `sharedRedeemCodes/${code.id}`), { isActive: !code.isActive });
      toast.success(!code.isActive ? "تم تفعيل الكود" : "تم تعطيل الكود");
    } catch {
      toast.error("فشل تحديث حالة الكود");
    }
  };

  // ─── Delete code ───────────────────────────────────
  const handleDeleteCode = async () => {
    if (!deletingCode) return;
    try {
      const path = deletingCode.type === "redeem"
        ? `redeemCodes/${deletingCode.code.id}`
        : `sharedRedeemCodes/${deletingCode.code.id}`;
      await remove(ref(db, path));
      toast.success("تم حذف الكود بنجاح");
      setDeletingCode(null);
    } catch {
      toast.error("فشل حذف الكود");
    }
  };

  // ─── Download PDF ──────────────────────────────────
  const handleDownloadPdf = async () => {
    setPdfGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Apple.NET - Gift Codes", 105, 15, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleDateString("ar-SA")}`, 105, 22, { align: "center" });

      // Single Codes Table
      if (redeemCodes.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Individual Codes", 14, 32);

        autoTable(doc, {
          startY: 36,
          head: [["#", "Code", "Amount", "Status", "Redeemed By"]],
          body: redeemCodes.map((c, i) => [
            i + 1,
            c.code,
            c.amount,
            c.isRedeemed ? "Redeemed" : "Available",
            c.redeemedBy || "-",
          ]),
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [240, 253, 244] },
          margin: { left: 14, right: 14 },
        });
      }

      // Shared Codes Table
      if (sharedCodes.length > 0) {
        const sharedStartY = (doc as any).lastAutoTable?.finalY
          ? (doc as any).lastAutoTable.finalY + 12
          : 36;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Shared Codes", 14, sharedStartY);

        autoTable(doc, {
          startY: sharedStartY + 4,
          head: [["#", "Code", "Amount", "Max", "Used", "Status", "Description"]],
          body: sharedCodes.map((c, i) => [
            i + 1,
            c.code,
            c.amount,
            c.maxRedemptions,
            c.currentRedemptions,
            c.isActive ? "Active" : "Inactive",
            c.description || "-",
          ]),
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [240, 253, 244] },
          margin: { left: 14, right: 14 },
        });
      }

      if (redeemCodes.length === 0 && sharedCodes.length === 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.text("No codes available", 105, 50, { align: "center" });
      }

      const pdfBytes = new Uint8Array(doc.output("arraybuffer"));
      const filename = `apple-net-codes-${Date.now()}.pdf`;
      const savedPath = await savePdfToDevice(pdfBytes, filename);
      toast.success(`تم حفظ الملف في: ${savedPath}`);
      setPdfSuccessPath(savedPath);
    } catch (error) {
      console.error("PDF error:", error);
      toast.error("فشل إنشاء ملف PDF");
    } finally {
      setPdfGenerating(false);
    }
  };

  // ─── Copy to clipboard ─────────────────────────────
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ");
  };

  // ─── Filter codes for list view ────────────────────
  const filteredRedeemCodes = redeemCodes.filter(c =>
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredSharedCodes = sharedCodes.filter(c =>
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Sub-view tabs ─────────────────────────────────
  const subViewTabs: { key: SubView; label: string; icon: React.ElementType }[] = [
    { key: "single", label: "توليد فردي", icon: Zap },
    { key: "bulk", label: "توليد جماعي", icon: Users },
    { key: "shared", label: "كود مشترك", icon: Hash },
    { key: "list", label: "القائمة", icon: List },
  ];

  // ─── Card animation ────────────────────────────────
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.04, duration: 0.3, ease: "easeOut" as const },
    }),
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <Gift className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">أكواد الهدايا</h1>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {redeemCodes.length} كود فردي &bull; {sharedCodes.length} كود مشترك
          </p>
        </div>
      </div>

      {/* ─── Sub-view Tabs ───────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {subViewTabs.map((tab) => {
          const isActive = activeView === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                transition-all duration-200
                ${isActive
                  ? "text-white shadow-lg shadow-emerald-500/25"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                }
              `}
              style={isActive ? { backgroundColor: "#10b981" } : {}}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── Loading ─────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          SUB-VIEW: SINGLE CODE
          ═══════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {activeView === "single" && !loading && (
          <motion.div
            key="single"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-500" />
                توليد كود فردي
              </h3>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">المبلغ</label>
                <Input
                  type="number"
                  min={1}
                  value={singleAmount}
                  onChange={(e) => setSingleAmount(e.target.value)}
                  placeholder="أدخل المبلغ"
                  className="bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                />
              </div>

              <Button
                onClick={handleGenerateSingle}
                disabled={singleSaving}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
              >
                {singleSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                توليد الكود
              </Button>

              {/* Generated code display */}
              <AnimatePresence>
                {singleGeneratedCode && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800"
                  >
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-2">تم توليد الكود:</p>
                    <div className="flex items-center gap-3">
                      <code
                        className="text-xl font-mono font-black text-emerald-700 dark:text-emerald-300 tracking-wider select-all"
                        dir="ltr"
                      >
                        {singleGeneratedCode}
                      </code>
                      <button
                        onClick={() => copyToClipboard(singleGeneratedCode)}
                        className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-700 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════
            SUB-VIEW: BULK CODES
            ═══════════════════════════════════════════════════ */}
        {activeView === "bulk" && !loading && (
          <motion.div
            key="bulk"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-500" />
                توليد أكواد جماعية
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">عدد الأكواد</label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={bulkCount}
                    onChange={(e) => setBulkCount(e.target.value)}
                    placeholder="1 - 500"
                    className="bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">المبلغ لكل كود</label>
                  <Input
                    type="number"
                    min={1}
                    value={bulkAmount}
                    onChange={(e) => setBulkAmount(e.target.value)}
                    placeholder="أدخل المبلغ"
                    className="bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <Button
                onClick={handleGenerateBulk}
                disabled={bulkSaving}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
              >
                {bulkSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                توليد الأكواد
              </Button>

              {/* Generated codes display */}
              <AnimatePresence>
                {bulkGeneratedCodes.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                        تم توليد {bulkGeneratedCodes.length} كود
                      </p>
                      <button
                        onClick={() => copyToClipboard(bulkGeneratedCodes.join("\n"))}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-200 dark:hover:bg-emerald-700 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        نسخ الكل
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                      {bulkGeneratedCodes.map((code, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg px-3 py-2"
                        >
                          <code className="text-sm font-mono font-bold text-gray-900 dark:text-white" dir="ltr">
                            {code}
                          </code>
                          <button
                            onClick={() => copyToClipboard(code)}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════
            SUB-VIEW: SHARED CODE
            ═══════════════════════════════════════════════════ */}
        {activeView === "shared" && !loading && (
          <motion.div
            key="shared"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Hash className="w-5 h-5 text-emerald-500" />
                كود مشترك
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">الكود</label>
                  <Input
                    value={sharedCode}
                    onChange={(e) => setSharedCode(e.target.value.toUpperCase())}
                    placeholder="مثال: APPLE2024"
                    className="bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 font-mono"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">المبلغ</label>
                  <Input
                    type="number"
                    min={1}
                    value={sharedAmount}
                    onChange={(e) => setSharedAmount(e.target.value)}
                    placeholder="أدخل المبلغ"
                    className="bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">الحد الأقصى للاستخدام</label>
                  <Input
                    type="number"
                    min={1}
                    value={sharedMaxRedemptions}
                    onChange={(e) => setSharedMaxRedemptions(e.target.value)}
                    placeholder="عدد مرات الاستخدام"
                    className="bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">الوصف (اختياري)</label>
                  <Input
                    value={sharedDescription}
                    onChange={(e) => setSharedDescription(e.target.value)}
                    placeholder="وصف الكود"
                    className="bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveShared}
                disabled={sharedSaving}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
              >
                {sharedSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إضافة الكود المشترك
              </Button>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════
            SUB-VIEW: LIST
            ═══════════════════════════════════════════════════ */}
        {activeView === "list" && !loading && (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Search & PDF Download */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث بكود أو وصف..."
                  className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 pr-10"
                />
              </div>
              <Button
                onClick={handleDownloadPdf}
                disabled={pdfGenerating || (redeemCodes.length === 0 && sharedCodes.length === 0)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 flex-shrink-0"
              >
                {pdfGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                تحميل PDF
              </Button>
            </div>

            {/* ─── Shared Codes ───────────────────────── */}
            {filteredSharedCodes.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-700 dark:text-slate-300 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-emerald-500" />
                  الأكواد المشتركة ({filteredSharedCodes.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <AnimatePresence mode="popLayout">
                    {filteredSharedCodes.map((code, index) => (
                      <motion.div
                        key={code.id}
                        custom={index}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 space-y-3 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <code className="text-sm font-mono font-bold text-gray-900 dark:text-white" dir="ltr">
                              {code.code}
                            </code>
                            {code.description && (
                              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{code.description}</p>
                            )}
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            code.isActive
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                              : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                          }`}>
                            {code.isActive ? "نشط" : "معطّل"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                          <span className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-semibold">
                            {code.amount} ر.ي
                          </span>
                          <span className="text-gray-500 dark:text-slate-400">
                            {code.currentRedemptions} / {code.maxRedemptions} استخدام
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min((code.currentRedemptions / code.maxRedemptions) * 100, 100)}%`,
                              backgroundColor: "#10b981",
                            }}
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => toggleSharedActive(code)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
                            style={{
                              backgroundColor: code.isActive ? "rgba(16,185,129,0.1)" : "rgba(156,163,175,0.1)",
                              color: code.isActive ? "#10b981" : "#9ca3af",
                            }}
                          >
                            {code.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            {code.isActive ? "نشط" : "معطّل"}
                          </button>
                          <button
                            onClick={() => copyToClipboard(code.code)}
                            className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingCode({ type: "shared", code })}
                            className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* ─── Individual Codes ────────────────────── */}
            {filteredRedeemCodes.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-700 dark:text-slate-300 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  الأكواد الفردية ({filteredRedeemCodes.length})
                </h3>
                <div className="max-h-96 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  <AnimatePresence mode="popLayout">
                    {filteredRedeemCodes.map((code, index) => (
                      <motion.div
                        key={code.id}
                        custom={index}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-3 flex items-center gap-3 hover:shadow-md hover:shadow-emerald-500/5 transition-all duration-200"
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          code.isRedeemed ? "bg-gray-300 dark:bg-slate-600" : "bg-emerald-500"
                        }`} />
                        <code className="text-sm font-mono font-bold text-gray-900 dark:text-white flex-shrink-0" dir="ltr">
                          {code.code}
                        </code>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 flex-shrink-0">
                          {code.amount} ر.ي
                        </span>
                        <span className={`text-[10px] font-bold flex-shrink-0 ${
                          code.isRedeemed
                            ? "text-gray-400 dark:text-slate-500"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}>
                          {code.isRedeemed ? "مستخدم" : "متاح"}
                        </span>
                        {code.redeemedBy && (
                          <span className="text-[10px] text-gray-400 dark:text-slate-500 truncate">
                            بواسطة: {code.redeemedBy}
                          </span>
                        )}
                        <div className="flex-1" />
                        <button
                          onClick={() => copyToClipboard(code.code)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                        <button
                          onClick={() => setDeletingCode({ type: "redeem", code })}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* ─── Empty State ─────────────────────────── */}
            {filteredRedeemCodes.length === 0 && filteredSharedCodes.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-8 h-8 text-gray-300 dark:text-slate-600" />
                </div>
                <p className="text-gray-500 dark:text-slate-400 text-sm">
                  {searchQuery ? "لا توجد نتائج للبحث" : "لا توجد أكواد بعد"}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Delete Confirmation Modal ───────────────── */}
      <AnimatePresence>
        {deletingCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDeletingCode(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-2">
                تأكيد الحذف
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center mb-6">
                هل أنت متأكد من حذف الكود &quot;{deletingCode.code.code}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={handleDeleteCode}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  حذف
                </Button>
                <Button
                  onClick={() => setDeletingCode(null)}
                  variant="outline"
                  className="flex-1 border-gray-300 dark:border-slate-600"
                >
                  إلغاء
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── PDF Success Modal ───────────────────────── */}
      <AnimatePresence>
        {pdfSuccessPath && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPdfSuccessPath(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mx-auto mb-4">
                <Check className="w-7 h-7 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-2">
                تم الحفظ بنجاح
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center mb-1">
                تم حفظ الملف في:
              </p>
              <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <code className="text-xs text-gray-700 dark:text-slate-300 break-all" dir="ltr">
                  {pdfSuccessPath}
                </code>
                <button
                  onClick={() => copyToClipboard(pdfSuccessPath)}
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
                >
                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
              <Button
                onClick={() => setPdfSuccessPath(null)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                حسناً
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
