"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import { ref, set, get, push, update, remove, onValue, runTransaction } from "firebase/database";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CreditCard, Plus, Search, Filter, Download, X, Trash2,
  Copy, FileText, ChevronDown, Package, Tag, Wifi, Check,
  AlertTriangle, Eye, QrCode, List
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface CardData {
  id: string;
  code: string;
  price: number;
  data: string;
  duration: number;
  isUsed: boolean;
  usedBy: string | null;
  usedAt: number | null;
  tier: string;
  network: string;
  createdAt: number;
}

interface NetworkInfo {
  id: string;
  name: string;
  emoji: string;
}

interface CardsSectionProps {
  managedNetwork?: string;
}

// ─── Save PDF to device (Capacitor or web) ──────────────
async function savePdfToDevice(pdfBytes: Uint8Array, filename: string): Promise<string> {
  try {
    if (typeof window !== "undefined" && "Capacitor" in window) {
      const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
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
  // Fallback to web download
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return filename;
}

// ─── Generate random card code ──────────────────────────
function generateRandomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    if (i > 0) code += "-";
    for (let j = 0; j < 4; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return code;
}

export function CardsSection({ managedNetwork }: CardsSectionProps) {
  const [cards, setCards] = useState<CardData[]>([]);
  const [networks, setNetworks] = useState<NetworkInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterNetwork, setFilterNetwork] = useState<string>(managedNetwork || "all");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "available" | "sold">("all");

  // Add card modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<"single" | "bulk" | "paste">("single");

  // Single card form
  const [formCode, setFormCode] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formData, setFormData] = useState("");
  const [formDuration, setFormDuration] = useState("");
  const [formTier, setFormTier] = useState("");
  const [formNetwork, setFormNetwork] = useState(managedNetwork || "");

  // Bulk card form
  const [formBulkCount, setFormBulkCount] = useState("10");

  // Paste codes form
  const [formPasteCodes, setFormPasteCodes] = useState("");

  // PDF modal
  const [pdfFilePath, setPdfFilePath] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  // ─── Real-time cards listener ─────────────────────────
  useEffect(() => {
    const cardsRef = managedNetwork
      ? ref(db, "cards")
      : ref(db, "cards");

    const unsub = onValue(cardsRef, (snap) => {
      const data = snap.val() || {};
      let list: CardData[] = Object.entries(data).map(([id, v]: [string, any]) => ({
        id,
        code: v.code || "",
        price: v.price || 0,
        data: v.data || "",
        duration: v.duration || 0,
        isUsed: v.isUsed || false,
        usedBy: v.usedBy || null,
        usedAt: v.usedAt || null,
        tier: v.tier || "",
        network: v.network || "",
        createdAt: v.createdAt || 0,
      }));

      // If network manager, filter to only their network
      if (managedNetwork) {
        list = list.filter(c => c.network === managedNetwork);
      }

      setCards(list.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });
    return () => unsub();
  }, [managedNetwork]);

  // ─── Load networks ────────────────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, "networks"), (snap) => {
      const data = snap.val() || {};
      const list: NetworkInfo[] = Object.entries(data).map(([id, v]: [string, any]) => ({
        id,
        name: v.name || "",
        emoji: v.emoji || "📡",
      }));
      setNetworks(list);
    });
    return () => unsub();
  }, []);

  // ─── Tiers list ───────────────────────────────────────
  const tiers = ["200", "300", "500", "1000", "2000"];

  // ─── Filter cards ─────────────────────────────────────
  const filteredCards = cards.filter(c => {
    if (searchQuery && !c.code.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterNetwork !== "all" && c.network !== filterNetwork) return false;
    if (filterTier !== "all" && c.tier !== filterTier) return false;
    if (filterStatus === "available" && c.isUsed) return false;
    if (filterStatus === "sold" && !c.isUsed) return false;
    return true;
  });

  // ─── Stats ────────────────────────────────────────────
  const availableCount = cards.filter(c => !c.isUsed).length;
  const soldCount = cards.filter(c => c.isUsed).length;

  // ─── Reset form ───────────────────────────────────────
  const resetForm = () => {
    setFormCode("");
    setFormPrice("");
    setFormData("");
    setFormDuration("");
    setFormTier("");
    setFormNetwork(managedNetwork || "");
    setFormBulkCount("10");
    setFormPasteCodes("");
    setAddMode("single");
  };

  // ─── Add single card ──────────────────────────────────
  const handleAddSingle = async () => {
    if (!formCode.trim() || !formPrice || !formTier || !formNetwork) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    setSaving(true);
    try {
      const newRef = push(ref(db, "cards"));
      await set(newRef, {
        code: formCode.trim().toUpperCase(),
        price: Number(formPrice),
        data: formData.trim(),
        duration: Number(formDuration) || 0,
        tier: formTier,
        network: formNetwork,
        isUsed: false,
        usedBy: null,
        usedAt: null,
        createdAt: Date.now(),
      });
      toast.success("تم إضافة البطاقة بنجاح");
      resetForm();
      setShowAddModal(false);
    } catch (error: any) {
      toast.error("خطأ: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Add bulk cards ───────────────────────────────────
  const handleAddBulk = async () => {
    const count = Number(formBulkCount);
    if (!count || count < 1 || count > 500) {
      toast.error("عدد البطاقات يجب أن يكون بين 1 و 500");
      return;
    }
    if (!formPrice || !formTier || !formNetwork) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    setSaving(true);
    try {
      const updates: Record<string, any> = {};
      for (let i = 0; i < count; i++) {
        const newRef = push(ref(db, "cards"));
        updates[newRef.key!] = {
          code: generateRandomCode(),
          price: Number(formPrice),
          data: formData.trim(),
          duration: Number(formDuration) || 0,
          tier: formTier,
          network: formNetwork,
          isUsed: false,
          usedBy: null,
          usedAt: null,
          createdAt: Date.now(),
        };
      }
      await update(ref(db, "cards"), updates);
      toast.success(`تم إضافة ${count} بطاقة بنجاح`);
      resetForm();
      setShowAddModal(false);
    } catch (error: any) {
      toast.error("خطأ: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Add pasted codes ─────────────────────────────────
  const handleAddPasted = async () => {
    if (!formPasteCodes.trim()) {
      toast.error("يرجى لصق الأكواد");
      return;
    }
    if (!formPrice || !formTier || !formNetwork) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    setSaving(true);
    try {
      const codes = formPasteCodes
        .split("\n")
        .map(c => c.trim())
        .filter(c => c.length > 0);

      if (codes.length === 0) {
        toast.error("لم يتم العثور على أكواد صالحة");
        setSaving(false);
        return;
      }

      const updates: Record<string, any> = {};
      for (const code of codes) {
        const newRef = push(ref(db, "cards"));
        updates[newRef.key!] = {
          code: code.toUpperCase(),
          price: Number(formPrice),
          data: formData.trim(),
          duration: Number(formDuration) || 0,
          tier: formTier,
          network: formNetwork,
          isUsed: false,
          usedBy: null,
          usedAt: null,
          createdAt: Date.now(),
        };
      }
      await update(ref(db, "cards"), updates);
      toast.success(`تم إضافة ${codes.length} بطاقة بنجاح`);
      resetForm();
      setShowAddModal(false);
    } catch (error: any) {
      toast.error("خطأ: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete card ──────────────────────────────────────
  const handleDeleteCard = async (cardId: string) => {
    try {
      await remove(ref(db, `cards/${cardId}`));
      toast.success("تم حذف البطاقة");
    } catch (error: any) {
      toast.error("خطأ في حذف البطاقة");
    }
  };

  // ─── Download PDF ─────────────────────────────────────
  const handleDownloadPdf = async () => {
    const cardsToExport = filteredCards.filter(c => !c.isUsed);
    if (cardsToExport.length === 0) {
      toast.error("لا توجد بطاقات متاحة للتصدير");
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Title
      doc.setFontSize(16);
      doc.text("Apple.NET - Card Codes", 105, 15, { align: "center" });

      doc.setFontSize(10);
      doc.text(`Total: ${cardsToExport.length} cards | Generated: ${new Date().toLocaleDateString("ar-YE")}`, 105, 22, { align: "center" });

      // Table data
      const tableData = cardsToExport.map((card, index) => [
        (index + 1).toString(),
        card.code,
        `${card.price} RY`,
        card.data || "—",
        `${card.duration} يوم`,
        card.tier,
        networks.find(n => n.id === card.network)?.name || card.network,
      ]);

      autoTable(doc, {
        startY: 28,
        head: [["#", "Code", "Price", "Data", "Duration", "Tier", "Network"]],
        body: tableData,
        styles: {
          fontSize: 8,
          cellPadding: 2,
          halign: "center",
        },
        headStyles: {
          fillColor: [27, 122, 61],
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [240, 253, 244],
        },
        margin: { top: 28 },
      });

      const pdfBytes = new Uint8Array(doc.output("arraybuffer"));
      const filename = `apple-net-cards-${Date.now()}.pdf`;
      const savedPath = await savePdfToDevice(pdfBytes, filename);

      toast.success(`تم حفظ الملف في: ${savedPath}`);
      setPdfFilePath(savedPath);
    } catch (error: any) {
      toast.error("خطأ في إنشاء PDF: " + error.message);
    }
  };

  // ─── Get network name ─────────────────────────────────
  const getNetworkName = (networkId: string) => {
    return networks.find(n => n.id === networkId)?.name || networkId;
  };

  // ─── Copy code to clipboard ───────────────────────────
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("تم نسخ الكود");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">إدارة البطاقات</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {cards.length} بطاقة إجمالاً • {availableCount} متاحة • {soldCount} مباعة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDownloadPdf}
            variant="outline"
            className="rounded-xl h-10"
          >
            <Download className="w-4 h-4 ml-1.5" />
            تصدير PDF
          </Button>
          <Button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="rounded-xl h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4 ml-1.5" />
            إضافة بطاقة
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بكود البطاقة..."
            className="pr-10 h-10 rounded-xl"
          />
        </div>

        {/* Network Filter */}
        {!managedNetwork && (
          <select
            value={filterNetwork}
            onChange={(e) => setFilterNetwork(e.target.value)}
            className="h-10 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 px-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="all">جميع الشبكات</option>
            {networks.map(n => (
              <option key={n.id} value={n.id}>{n.emoji} {n.name}</option>
            ))}
          </select>
        )}

        {/* Tier Filter */}
        <select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
          className="h-10 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 px-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
          <option value="all">جميع الفئات</option>
          {tiers.map(t => (
            <option key={t} value={t}>فئة {t}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="h-10 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 px-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
          <option value="all">الكل</option>
          <option value="available">متاحة</option>
          <option value="sold">مباعة</option>
        </select>
      </div>

      {/* Cards List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="text-center py-12">
          <CreditCard className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400 dark:text-slate-500">لا توجد بطاقات</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filteredCards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.01, 0.5) }}
              className={`rounded-xl p-3 border transition-all ${
                card.isUsed
                  ? "bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-800 opacity-60"
                  : "bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md"
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Status indicator */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  card.isUsed ? "bg-red-400" : "bg-emerald-500"
                }`} />

                {/* Card code */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-gray-900 dark:text-white" dir="ltr">
                      {card.code}
                    </span>
                    <button
                      onClick={() => copyCode(card.code)}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                      title="نسخ"
                    >
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">
                      {card.price} ريال
                    </span>
                    {card.data && (
                      <span className="text-[10px] text-gray-500 dark:text-slate-400">{card.data}</span>
                    )}
                    {card.duration > 0 && (
                      <span className="text-[10px] text-gray-500 dark:text-slate-400">{card.duration} يوم</span>
                    )}
                    {card.tier && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
                        فئة {card.tier}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-500 dark:text-slate-400">
                      {getNetworkName(card.network)}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div className="flex-shrink-0">
                  {card.isUsed ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                      مباعة
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                      متاحة
                    </span>
                  )}
                </div>

                {/* Delete */}
                {!card.isUsed && (
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors flex-shrink-0"
                    title="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ═══ Add Card Modal ═══ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">إضافة بطاقات</h3>
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex gap-1 p-3 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
              {[
                { id: "single" as const, label: "بطاقة واحدة", icon: CreditCard },
                { id: "bulk" as const, label: "عدد من البطاقات", icon: Package },
                { id: "paste" as const, label: "لصق أكواد", icon: List },
              ].map(mode => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setAddMode(mode.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      addMode === mode.id
                        ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800"
                        : "bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {mode.label}
                  </button>
                );
              })}
            </div>

            <div className="overflow-y-auto p-4 space-y-4 flex-1">
              {/* Single: Code field */}
              {addMode === "single" && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 block">كود البطاقة *</label>
                  <Input
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    className="h-10 rounded-xl font-mono"
                    dir="ltr"
                  />
                </div>
              )}

              {/* Bulk: Count field */}
              {addMode === "bulk" && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 block">عدد البطاقات *</label>
                  <Input
                    type="number"
                    value={formBulkCount}
                    onChange={(e) => setFormBulkCount(e.target.value)}
                    placeholder="10"
                    min="1"
                    max="500"
                    className="h-10 rounded-xl"
                    dir="ltr"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">سيتم إنشاء أكواد عشوائية (الحد الأقصى 500)</p>
                </div>
              )}

              {/* Paste: Text area */}
              {addMode === "paste" && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 block">لصق الأكواد (كل كود في سطر)</label>
                  <textarea
                    value={formPasteCodes}
                    onChange={(e) => setFormPasteCodes(e.target.value)}
                    placeholder={"XXXX-XXXX-XXXX-XXXX\nYYYY-YYYY-YYYY-YYYY\n..."}
                    rows={6}
                    dir="ltr"
                    className="w-full rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 py-2 text-sm font-mono text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                  />
                </div>
              )}

              {/* Common fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 block">السعر *</label>
                  <Input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="500"
                    className="h-10 rounded-xl"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 block">الفئة *</label>
                  <select
                    value={formTier}
                    onChange={(e) => setFormTier(e.target.value)}
                    className="w-full h-10 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    <option value="">اختر الفئة</option>
                    {tiers.map(t => (
                      <option key={t} value={t}>فئة {t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 block">البيانات</label>
                  <Input
                    value={formData}
                    onChange={(e) => setFormData(e.target.value)}
                    placeholder="2 جيجابايت"
                    className="h-10 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 block">المدة (أيام)</label>
                  <Input
                    type="number"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    placeholder="5"
                    className="h-10 rounded-xl"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 block">الشبكة *</label>
                <select
                  value={formNetwork}
                  onChange={(e) => setFormNetwork(e.target.value)}
                  disabled={!!managedNetwork}
                  className="w-full h-10 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50"
                >
                  <option value="">اختر الشبكة</option>
                  {networks.map(n => (
                    <option key={n.id} value={n.id}>{n.emoji} {n.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 p-4 border-t border-gray-100 dark:border-slate-800 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="flex-1 rounded-xl h-10"
              >
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  if (addMode === "single") handleAddSingle();
                  else if (addMode === "bulk") handleAddBulk();
                  else handleAddPasted();
                }}
                disabled={saving}
                className="flex-1 rounded-xl h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? "جاري الإضافة..." : (
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    إضافة
                  </span>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══ PDF Path Modal ═══ */}
      {pdfFilePath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden"
          >
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">تم حفظ الملف بنجاح</h3>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800 mt-3">
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mb-1">مسار الملف:</p>
                <p className="text-xs font-mono text-gray-900 dark:text-white break-all" dir="ltr">{pdfFilePath}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-4 border-t border-gray-100 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => setPdfFilePath(null)}
                className="flex-1 rounded-xl h-10"
              >
                إغلاق
              </Button>
              <Button
                onClick={() => setPdfFilePath(null)}
                className="flex-1 rounded-xl h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                تم
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
