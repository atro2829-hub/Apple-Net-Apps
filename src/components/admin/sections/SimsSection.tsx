"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase";
import {
  ref,
  set,
  get,
  push,
  update,
  remove,
  onValue,
} from "firebase/database";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compressImageToBase64 } from "@/lib/utils";
import {
  Smartphone,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Image as ImageIcon,
  ToggleLeft,
  DollarSign,
  Tag,
  CheckCircle2,
  XCircle,
  Upload,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface SimCard {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  isAvailable: boolean;
}

const emptySim: Omit<SimCard, "id"> = {
  name: "",
  price: 0,
  description: "",
  imageUrl: "",
  isAvailable: true,
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function SimsSection() {
  const [sims, setSims] = useState<SimCard[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingSim, setEditingSim] = useState<Omit<SimCard, "id"> & { id?: string }>(emptySim);
  const [deleteSimId, setDeleteSimId] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  // ─── Real-time Listener ──────────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, "sims"), (snap) => {
      const data = snap.val() || {};
      const list: SimCard[] = Object.entries(data).map(
        ([key, val]: [string, any]) => ({
          id: key,
          name: val.name || "",
          price: val.price || 0,
          description: val.description || "",
          imageUrl: val.imageUrl || "",
          isAvailable: val.isAvailable !== false,
        })
      );
      setSims(list);
    });
    return () => unsub();
  }, []);

  // ─── Image Upload ────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const base64 = await compressImageToBase64(file, 512, 0.7);
      setEditingSim((prev) => ({ ...prev, imageUrl: base64 }));
      toast.success("تم رفع الصورة بنجاح");
    } catch {
      toast.error("حدث خطأ في رفع الصورة");
    } finally {
      setImageUploading(false);
    }
  };

  // ─── CRUD Operations ─────────────────────────────────
  const saveSim = async () => {
    if (!editingSim.name.trim()) {
      toast.error("يرجى إدخال اسم الشريحة");
      return;
    }
    if (editingSim.price <= 0) {
      toast.error("يرجى إدخال سعر صحيح");
      return;
    }
    try {
      const { id, ...data } = editingSim;
      const payload = { ...data };

      if (id) {
        await update(ref(db, `sims/${id}`), payload);
        toast.success("تم تحديث الشريحة بنجاح");
      } else {
        await push(ref(db, "sims"), payload);
        toast.success("تم إضافة الشريحة بنجاح");
      }
      setShowModal(false);
      setEditingSim(emptySim);
    } catch {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const deleteSim = async (id: string) => {
    try {
      await remove(ref(db, `sims/${id}`));
      toast.success("تم حذف الشريحة بنجاح");
      setDeleteSimId(null);
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  // ─── Filtered sims ───────────────────────────────────
  const filteredSims = sims.filter((sim) =>
    sim.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Format price with commas ────────────────────────
  const formatPrice = (price: number) => price.toLocaleString();

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════

  return (
    <div className="space-y-6" dir="rtl">
      {/* ─── Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">
              شرائح SIM
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              إدارة شرائح الاتصال المتاحة
            </p>
          </div>
        </div>
      </div>

      {/* ─── Search & Add ──────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم الشريحة..."
            className="pr-9"
          />
        </div>
        <Button
          onClick={() => {
            setEditingSim(emptySim);
            setShowModal(true);
          }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold gap-2"
        >
          <Plus className="w-4 h-4" />
          إضافة شريحة
        </Button>
      </div>

      {/* ─── Stats ─────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-3 text-center">
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {sims.length}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold">
            إجمالي الشرائح
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-3 text-center">
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {sims.filter((s) => s.isAvailable).length}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold">
            متاحة
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-3 text-center">
          <p className="text-2xl font-black text-red-500 dark:text-red-400">
            {sims.filter((s) => !s.isAvailable).length}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold">
            غير متاحة
          </p>
        </div>
      </div>

      {/* ─── Grid ──────────────────────────────────────── */}
      {filteredSims.length === 0 ? (
        <div className="text-center py-16">
          <Smartphone className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400 dark:text-slate-500">
            {searchQuery ? "لا توجد نتائج للبحث" : "لا توجد شرائح حتى الآن"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence>
            {filteredSims.map((sim) => (
              <motion.div
                key={sim.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group"
              >
                {/* Image Preview */}
                <div className="relative aspect-[4/3] bg-gray-100 dark:bg-slate-800 overflow-hidden">
                  {sim.imageUrl ? (
                    <img
                      src={sim.imageUrl}
                      alt={sim.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-gray-300 dark:text-slate-600" />
                    </div>
                  )}

                  {/* Availability Badge */}
                  <div className="absolute top-2 right-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm ${
                        sim.isAvailable
                          ? "bg-emerald-500/90 text-white"
                          : "bg-red-500/90 text-white"
                      }`}
                    >
                      {sim.isAvailable ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {sim.isAvailable ? "متاحة" : "غير متاحة"}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">
                      {sim.name}
                    </h4>
                    {sim.description && (
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {sim.description}
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {formatPrice(sim.price)}
                    </span>
                    <span className="text-xs text-gray-400">ر.ي</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1 border-t border-gray-100 dark:border-slate-800">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingSim(sim);
                        setShowModal(true);
                      }}
                      className="flex-1 gap-1 text-xs h-8"
                    >
                      <Pencil className="w-3 h-3" />
                      تعديل
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteSimId(sim.id)}
                      className="gap-1 text-xs h-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ═══ Add/Edit Modal ═══════════════════════════════ */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-500" />
                  {editingSim.id ? "تعديل الشريحة" : "إضافة شريحة جديدة"}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Name */}
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1.5 block">
                    اسم الشريحة
                  </label>
                  <Input
                    value={editingSim.name}
                    onChange={(e) =>
                      setEditingSim((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="مثال: شريحة Y هلق"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    السعر (ر.ي)
                  </label>
                  <Input
                    type="number"
                    value={editingSim.price || ""}
                    onChange={(e) =>
                      setEditingSim((prev) => ({
                        ...prev,
                        price: Number(e.target.value),
                      }))
                    }
                    placeholder="0"
                    dir="ltr"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1.5 block">
                    الوصف
                  </label>
                  <textarea
                    value={editingSim.description}
                    onChange={(e) =>
                      setEditingSim((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="وصف الشريحة..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 dark:bg-slate-800/50"
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    صورة الشريحة
                  </label>

                  {/* Preview */}
                  {editingSim.imageUrl && (
                    <div className="relative mb-3">
                      <img
                        src={editingSim.imageUrl}
                        alt="Preview"
                        className="w-full max-h-48 object-contain rounded-xl border border-gray-200 dark:border-slate-700"
                      />
                      <button
                        onClick={() =>
                          setEditingSim((prev) => ({
                            ...prev,
                            imageUrl: "",
                          }))
                        }
                        className="absolute top-2 left-2 p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <label
                    className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
                      editingSim.imageUrl
                        ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10"
                        : "border-gray-300 dark:border-slate-600 hover:border-emerald-500 dark:hover:border-emerald-500"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={imageUploading}
                    />
                    {imageUploading ? (
                      <>
                        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                          جاري الرفع...
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400 dark:text-slate-500" />
                        <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                          {editingSim.imageUrl
                            ? "تغيير الصورة"
                            : "اضغط لرفع صورة"}
                        </span>
                      </>
                    )}
                  </label>

                  {/* Or enter URL directly */}
                  <div className="mt-3">
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 mb-1.5 text-center">
                      أو أدخل رابط الصورة مباشرة
                    </p>
                    <Input
                      value={
                        editingSim.imageUrl &&
                        !editingSim.imageUrl.startsWith("data:")
                          ? editingSim.imageUrl
                          : ""
                      }
                      onChange={(e) =>
                        setEditingSim((prev) => ({
                          ...prev,
                          imageUrl: e.target.value,
                        }))
                      }
                      placeholder="https://example.com/image.jpg"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* isAvailable Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <ToggleLeft className="w-5 h-5 text-emerald-500" />
                    <div>
                      <span className="text-sm font-bold text-gray-700 dark:text-slate-300 block">
                        حالة التوفر
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500">
                        {editingSim.isAvailable
                          ? "الشريحة متاحة للشراء"
                          : "الشريحة غير متاحة حالياً"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setEditingSim((prev) => ({
                        ...prev,
                        isAvailable: !prev.isAvailable,
                      }))
                    }
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      editingSim.isAvailable
                        ? "bg-emerald-500"
                        : "bg-gray-300 dark:bg-slate-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                        editingSim.isAvailable
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-white dark:bg-slate-900 p-5 border-t border-gray-100 dark:border-slate-800 flex gap-3">
                <Button
                  onClick={saveSim}
                  disabled={imageUploading}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                >
                  {editingSim.id ? "تحديث الشريحة" : "إضافة الشريحة"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Delete Confirmation ═════════════════════════ */}
      <AnimatePresence>
        {deleteSimId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDeleteSimId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h4 className="text-lg font-black text-gray-900 dark:text-white mb-2">
                تأكيد الحذف
              </h4>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                هل أنت متأكد من حذف هذه الشريحة؟ لا يمكن التراجع عن هذا
                الإجراء.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => deleteSim(deleteSimId)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold"
                >
                  حذف
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeleteSimId(null)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
