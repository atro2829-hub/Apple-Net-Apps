"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase";
import { ref, set, get, push, update, remove, onValue } from "firebase/database";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compressImageToBase64 } from "@/lib/utils";
import {
  Megaphone, Plus, Edit3, Trash2, X, Image as ImageIcon,
  Eye, ToggleLeft, ToggleRight, Loader2, AlertTriangle
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────
interface AdData {
  id: string;
  title: string;
  description: string;
  imageBase64: string;
  isActive: boolean;
  createdAt: number;
}

// ─── Component ──────────────────────────────────────────
export function AdsSection() {
  const [ads, setAds] = useState<AdData[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formImageBase64, setFormImageBase64] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Full-screen preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Delete confirmation
  const [deletingAd, setDeletingAd] = useState<AdData | null>(null);

  // ─── Real-time ads listener ─────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, "ads"), (snap) => {
      const data = snap.val() || {};
      const adsList: AdData[] = Object.entries(data).map(([id, v]: [string, any]) => ({
        id,
        title: v.title || "",
        description: v.description || "",
        imageBase64: v.imageBase64 || "",
        isActive: v.isActive !== false,
        createdAt: v.createdAt || 0,
      }));
      setAds(adsList.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ─── Reset form ──────────────────────────────────────
  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormImageBase64("");
    setFormIsActive(true);
    setEditingId(null);
    setShowForm(false);
  };

  // ─── Open form for editing ──────────────────────────
  const openEditForm = (ad: AdData) => {
    setFormTitle(ad.title);
    setFormDescription(ad.description);
    setFormImageBase64(ad.imageBase64);
    setFormIsActive(ad.isActive);
    setEditingId(ad.id);
    setShowForm(true);
  };

  // ─── Handle image upload ────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await compressImageToBase64(file);
      setFormImageBase64(base64);
      toast.success("تم رفع الصورة بنجاح");
    } catch {
      toast.error("فشل رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  // ─── Save ad ────────────────────────────────────────
  const handleSave = async () => {
    if (!formTitle.trim()) {
      toast.error("يرجى إدخال عنوان الإعلان");
      return;
    }
    setSaving(true);
    try {
      const adData: Omit<AdData, "id"> = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        imageBase64: formImageBase64,
        isActive: formIsActive,
        createdAt: Date.now(),
      };

      if (editingId) {
        await update(ref(db, `ads/${editingId}`), adData);
        toast.success("تم تحديث الإعلان بنجاح");
      } else {
        await push(ref(db, "ads"), adData);
        toast.success("تم إضافة الإعلان بنجاح");
      }
      resetForm();
    } catch {
      toast.error("فشل حفظ الإعلان");
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ad ──────────────────────────────────────
  const handleDelete = async (ad: AdData) => {
    try {
      await remove(ref(db, `ads/${ad.id}`));
      toast.success("تم حذف الإعلان بنجاح");
      setDeletingAd(null);
    } catch {
      toast.error("فشل حذف الإعلان");
    }
  };

  // ─── Toggle active ──────────────────────────────────
  const toggleActive = async (ad: AdData) => {
    try {
      await update(ref(db, `ads/${ad.id}`), { isActive: !ad.isActive });
      toast.success(!ad.isActive ? "تم تفعيل الإعلان" : "تم تعطيل الإعلان");
    } catch {
      toast.error("فشل تحديث حالة الإعلان");
    }
  };

  // ─── Animation variants ─────────────────────────────
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" as const },
    }),
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">الإعلانات</h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {ads.length} إعلان &bull; {ads.filter(a => a.isActive).length} نشط
            </p>
          </div>
        </div>
        <Button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          إضافة إعلان
        </Button>
      </div>

      {/* ─── Add/Edit Form ───────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {editingId ? "تعديل الإعلان" : "إضافة إعلان جديد"}
                </h3>
                <button
                  onClick={resetForm}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">العنوان</label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="أدخل عنوان الإعلان"
                  className="bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">الوصف</label>
                <Input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="أدخل وصف الإعلان"
                  className="bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">صورة الإعلان</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 border-2 border-dashed border-gray-300 dark:border-slate-600 cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors">
                    <ImageIcon className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                    <span className="text-sm text-gray-600 dark:text-slate-300">
                      {uploading ? "جارٍ الرفع..." : "اختر صورة"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                  {uploading && (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                  )}
                </div>
                {/* Image Preview */}
                {formImageBase64 && (
                  <div className="mt-3 relative group inline-block">
                    <img
                      src={formImageBase64}
                      alt="معاينة"
                      className="w-40 h-28 object-cover rounded-xl border border-gray-200 dark:border-slate-700"
                    />
                    <button
                      onClick={() => setFormImageBase64("")}
                      className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between py-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">حالة التفعيل</label>
                <button
                  onClick={() => setFormIsActive(!formIsActive)}
                  className="flex items-center gap-2"
                >
                  {formIsActive ? (
                    <ToggleRight className="w-8 h-8 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  )}
                  <span className={`text-sm font-medium ${formIsActive ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}`}>
                    {formIsActive ? "مفعّل" : "معطّل"}
                  </span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={saving || uploading}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 flex-1"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  {editingId ? "تحديث الإعلان" : "إضافة الإعلان"}
                </Button>
                <Button
                  onClick={resetForm}
                  variant="outline"
                  className="border-gray-300 dark:border-slate-600"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Loading State ───────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      )}

      {/* ─── Empty State ─────────────────────────────── */}
      {!loading && ads.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-8 h-8 text-gray-300 dark:text-slate-600" />
          </div>
          <p className="text-gray-500 dark:text-slate-400 text-sm">لا توجد إعلانات بعد</p>
          <p className="text-gray-400 dark:text-slate-500 text-xs mt-1">اضغط على &quot;إضافة إعلان&quot; لإنشاء إعلان جديد</p>
        </div>
      )}

      {/* ─── Ads Grid ────────────────────────────────── */}
      {!loading && ads.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {ads.map((ad, index) => (
              <motion.div
                key={ad.id}
                custom={index}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
                className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 group"
              >
                {/* Image */}
                {ad.imageBase64 ? (
                  <div
                    className="relative h-44 bg-gray-100 dark:bg-slate-800 cursor-pointer overflow-hidden"
                    onClick={() => setPreviewImage(ad.imageBase64)}
                  >
                    <img
                      src={ad.imageBase64}
                      alt={ad.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                      <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                    </div>
                    {/* Active Badge */}
                    <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-bold backdrop-blur-md ${
                      ad.isActive
                        ? "bg-emerald-500/80 text-white"
                        : "bg-gray-500/60 text-white"
                    }`}>
                      {ad.isActive ? "نشط" : "معطّل"}
                    </div>
                  </div>
                ) : (
                  <div className="h-44 bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-300 dark:text-slate-600" />
                  </div>
                )}

                {/* Content */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">{ad.title}</h3>
                    {ad.description && (
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">{ad.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => toggleActive(ad)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
                      style={{
                        backgroundColor: ad.isActive ? "rgba(16,185,129,0.1)" : "rgba(156,163,175,0.1)",
                        color: ad.isActive ? "#10b981" : "#9ca3af",
                      }}
                    >
                      {ad.isActive ? (
                        <ToggleRight className="w-4 h-4" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                      {ad.isActive ? "نشط" : "معطّل"}
                    </button>
                    <button
                      onClick={() => openEditForm(ad)}
                      className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingAd(ad)}
                      className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ─── Full-Screen Image Preview ───────────────── */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              src={previewImage}
              alt="معاينة كاملة"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Delete Confirmation Modal ───────────────── */}
      <AnimatePresence>
        {deletingAd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDeletingAd(null)}
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
                هل أنت متأكد من حذف الإعلان &quot;{deletingAd.title}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleDelete(deletingAd)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  حذف
                </Button>
                <Button
                  onClick={() => setDeletingAd(null)}
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
    </div>
  );
}
