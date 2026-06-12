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
  Image as ImageIcon, Plus, Edit3, Trash2, X, Eye,
  ToggleLeft, ToggleRight, Loader2, AlertTriangle,
  ArrowUp, ArrowDown, Link, Hash, GripVertical
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────
interface BannerData {
  id: string;
  title: string;
  imageBase64: string;
  link: string;
  order: number;
  isActive: boolean;
  createdAt: number;
}

// ─── Component ──────────────────────────────────────────
export function BannersSection() {
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formImageBase64, setFormImageBase64] = useState("");
  const [formLink, setFormLink] = useState("");
  const [formOrder, setFormOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Full-screen preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Delete confirmation
  const [deletingBanner, setDeletingBanner] = useState<BannerData | null>(null);

  // ─── Real-time banners listener ─────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, "homeBanners"), (snap) => {
      const data = snap.val() || {};
      const bannersList: BannerData[] = Object.entries(data).map(([id, v]: [string, any]) => ({
        id,
        title: v.title || "",
        imageBase64: v.imageBase64 || "",
        link: v.link || "",
        order: v.order || 0,
        isActive: v.isActive !== false,
        createdAt: v.createdAt || 0,
      }));
      setBanners(bannersList.sort((a, b) => a.order - b.order));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ─── Next order number ──────────────────────────────
  const getNextOrder = () => {
    if (banners.length === 0) return 1;
    return Math.max(...banners.map(b => b.order)) + 1;
  };

  // ─── Reset form ──────────────────────────────────────
  const resetForm = () => {
    setFormTitle("");
    setFormImageBase64("");
    setFormLink("");
    setFormOrder(getNextOrder());
    setFormIsActive(true);
    setEditingId(null);
    setShowForm(false);
  };

  // ─── Open form for editing ──────────────────────────
  const openEditForm = (banner: BannerData) => {
    setFormTitle(banner.title);
    setFormImageBase64(banner.imageBase64);
    setFormLink(banner.link);
    setFormOrder(banner.order);
    setFormIsActive(banner.isActive);
    setEditingId(banner.id);
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

  // ─── Save banner ────────────────────────────────────
  const handleSave = async () => {
    if (!formTitle.trim()) {
      toast.error("يرجى إدخال عنوان البانر");
      return;
    }
    setSaving(true);
    try {
      const bannerData: Omit<BannerData, "id"> = {
        title: formTitle.trim(),
        imageBase64: formImageBase64,
        link: formLink.trim(),
        order: formOrder,
        isActive: formIsActive,
        createdAt: Date.now(),
      };

      if (editingId) {
        await update(ref(db, `homeBanners/${editingId}`), bannerData);
        toast.success("تم تحديث البانر بنجاح");
      } else {
        await push(ref(db, "homeBanners"), bannerData);
        toast.success("تم إضافة البانر بنجاح");
      }
      resetForm();
    } catch {
      toast.error("فشل حفظ البانر");
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete banner ──────────────────────────────────
  const handleDelete = async (banner: BannerData) => {
    try {
      await remove(ref(db, `homeBanners/${banner.id}`));
      toast.success("تم حذف البانر بنجاح");
      setDeletingBanner(null);
    } catch {
      toast.error("فشل حذف البانر");
    }
  };

  // ─── Toggle active ──────────────────────────────────
  const toggleActive = async (banner: BannerData) => {
    try {
      await update(ref(db, `homeBanners/${banner.id}`), { isActive: !banner.isActive });
      toast.success(!banner.isActive ? "تم تفعيل البانر" : "تم تعطيل البانر");
    } catch {
      toast.error("فشل تحديث حالة البانر");
    }
  };

  // ─── Move banner up/down ────────────────────────────
  const moveBanner = async (banner: BannerData, direction: "up" | "down") => {
    const sorted = [...banners].sort((a, b) => a.order - b.order);
    const currentIndex = sorted.findIndex(b => b.id === banner.id);

    if (direction === "up" && currentIndex === 0) return;
    if (direction === "down" && currentIndex === sorted.length - 1) return;

    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const swapBanner = sorted[swapIndex];

    try {
      const updates: Record<string, number> = {};
      updates[`homeBanners/${banner.id}/order`] = swapBanner.order;
      updates[`homeBanners/${swapBanner.id}/order`] = banner.order;
      await update(ref(db), updates);
      toast.success("تم إعادة الترتيب بنجاح");
    } catch {
      toast.error("فشل إعادة الترتيب");
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
            <ImageIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">البانرات</h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {banners.length} بانر &bull; {banners.filter(b => b.isActive).length} نشط
            </p>
          </div>
        </div>
        <Button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          إضافة بانر
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
                  {editingId ? "تعديل البانر" : "إضافة بانر جديد"}
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
                  placeholder="أدخل عنوان البانر"
                  className="bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">صورة البانر</label>
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
                {formImageBase64 && (
                  <div className="mt-3 relative group inline-block">
                    <img
                      src={formImageBase64}
                      alt="معاينة"
                      className="w-full max-w-xs h-28 object-cover rounded-xl border border-gray-200 dark:border-slate-700"
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

              {/* Link */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">الرابط (اختياري)</label>
                <div className="relative">
                  <Link className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={formLink}
                    onChange={(e) => setFormLink(e.target.value)}
                    placeholder="https://example.com"
                    className="bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 pr-10"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Order */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">الترتيب</label>
                <div className="relative">
                  <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="number"
                    min={0}
                    value={formOrder}
                    onChange={(e) => setFormOrder(Number(e.target.value))}
                    className="bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 pr-10"
                  />
                </div>
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
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editingId ? "تحديث البانر" : "إضافة البانر"}
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
      {!loading && banners.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-8 h-8 text-gray-300 dark:text-slate-600" />
          </div>
          <p className="text-gray-500 dark:text-slate-400 text-sm">لا توجد بانرات بعد</p>
          <p className="text-gray-400 dark:text-slate-500 text-xs mt-1">اضغط على &quot;إضافة بانر&quot; لإنشاء بانر جديد</p>
        </div>
      )}

      {/* ─── Banners List ────────────────────────────── */}
      {!loading && banners.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {banners.map((banner, index) => (
              <motion.div
                key={banner.id}
                custom={index}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
                className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Image */}
                  {banner.imageBase64 ? (
                    <div
                      className="sm:w-48 h-40 sm:h-auto bg-gray-100 dark:bg-slate-800 cursor-pointer flex-shrink-0 overflow-hidden"
                      onClick={() => setPreviewImage(banner.imageBase64)}
                    >
                      <img
                        src={banner.imageBase64}
                        alt={banner.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="sm:w-48 h-40 sm:h-auto bg-gray-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-10 h-10 text-gray-300 dark:text-slate-600" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {/* Order Badge */}
                        <span
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold text-white"
                          style={{ backgroundColor: "#10b981" }}
                        >
                          {banner.order}
                        </span>
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white text-sm">{banner.title}</h3>
                          {banner.link && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate max-w-[200px]" dir="ltr">
                              {banner.link}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Active Status */}
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        banner.isActive
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                          : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                      }`}>
                        {banner.isActive ? "نشط" : "معطّل"}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Reorder Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveBanner(banner, "up")}
                          disabled={index === 0}
                          className="p-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="نقل لأعلى"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveBanner(banner, "down")}
                          disabled={index === banners.length - 1}
                          className="p-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="نقل لأسفل"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Toggle Active */}
                      <button
                        onClick={() => toggleActive(banner)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
                        style={{
                          backgroundColor: banner.isActive ? "rgba(16,185,129,0.1)" : "rgba(156,163,175,0.1)",
                          color: banner.isActive ? "#10b981" : "#9ca3af",
                        }}
                      >
                        {banner.isActive ? (
                          <ToggleRight className="w-4 h-4" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                        {banner.isActive ? "نشط" : "معطّل"}
                      </button>

                      <div className="flex-1" />

                      {/* Edit */}
                      <button
                        onClick={() => openEditForm(banner)}
                        className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setDeletingBanner(banner)}
                        className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
        {deletingBanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDeletingBanner(null)}
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
                هل أنت متأكد من حذف البانر &quot;{deletingBanner.title}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleDelete(deletingBanner)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  حذف
                </Button>
                <Button
                  onClick={() => setDeletingBanner(null)}
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
