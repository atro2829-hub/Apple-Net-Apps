"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import { ref, set, get, push, update, remove, onValue, runTransaction } from "firebase/database";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compressImageToBase64 } from "@/lib/utils";
import { PROVINCES, getDistricts } from "@/lib/constants";
import {
  Wifi, Plus, Edit3, Trash2, X, MapPin, Globe, Image as ImageIcon,
  Search, AlertTriangle, Check, Upload, User as UserIcon, ChevronDown,
  Building2
} from "lucide-react";

interface NetworkData {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  emoji: string;
  ownerId: string | null;
  ownerName: string | null;
  ownerPhone: string | null;
  location: string | null;
  provinceId: string | null;
  provinceName: string | null;
  district: string | null;
  exactLocation: string | null;
  connectionIP: string | null;
  imageBase64: string | null;
  networkType: string | null;
  coverage: string | null;
  speed: string | null;
  createdAt: number;
}

interface ManagerUser {
  uid: string;
  displayName: string;
  email: string;
  phone: string;
}

export function NetworksSection() {
  const [networks, setNetworks] = useState<NetworkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<NetworkData | null>(null);
  const [deletingNetwork, setDeletingNetwork] = useState<NetworkData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [formName, setFormName] = useState("");
  const [formProvinceId, setFormProvinceId] = useState("");
  const [formDistrict, setFormDistrict] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formIP, setFormIP] = useState("");
  const [formImageBase64, setFormImageBase64] = useState<string | null>(null);
  const [formManagerSearch, setFormManagerSearch] = useState("");
  const [formSelectedManager, setFormSelectedManager] = useState<ManagerUser | null>(null);
  const [formColor, setFormColor] = useState("#1B7A3D");
  const [formBgColor, setFormBgColor] = useState("#E8F5E9");
  const [formEmoji, setFormEmoji] = useState("📡");
  const [saving, setSaving] = useState(false);

  // Managers list
  const [managers, setManagers] = useState<ManagerUser[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<ManagerUser[]>([]);

  // Image upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // ─── Real-time networks listener ──────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, "networks"), (snap) => {
      const data = snap.val() || {};
      const list: NetworkData[] = Object.entries(data).map(([id, v]: [string, any]) => ({
        id,
        name: v.name || "",
        color: v.color || "#1B7A3D",
        bgColor: v.bgColor || "#E8F5E9",
        emoji: v.emoji || "📡",
        ownerId: v.ownerId || null,
        ownerName: v.ownerName || null,
        ownerPhone: v.ownerPhone || null,
        location: v.location || null,
        provinceId: v.provinceId || null,
        provinceName: v.provinceName || null,
        district: v.district || null,
        exactLocation: v.exactLocation || null,
        connectionIP: v.connectionIP || null,
        imageBase64: v.imageBase64 || null,
        networkType: v.networkType || null,
        coverage: v.coverage || null,
        speed: v.speed || null,
        createdAt: v.createdAt || 0,
      }));
      setNetworks(list.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ─── Load managers ────────────────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, "users"), (snap) => {
      const data = snap.val() || {};
      const managerList: ManagerUser[] = Object.entries(data)
        .filter(([, v]: [string, any]) => v.role === "network_manager")
        .map(([uid, v]: [string, any]) => ({
          uid,
          displayName: v.displayName || "",
          email: v.email || "",
          phone: v.phone || "",
        }));
      setManagers(managerList);
    });
    return () => unsub();
  }, []);

  // ─── Filter managers by search ────────────────────────
  useEffect(() => {
    if (!formManagerSearch) {
      setFilteredManagers(managers);
    } else {
      const q = formManagerSearch.toLowerCase();
      setFilteredManagers(
        managers.filter(m =>
          m.displayName.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.phone.includes(q)
        )
      );
    }
  }, [formManagerSearch, managers]);

  // ─── Districts for selected province ──────────────────
  const currentDistricts = formProvinceId ? getDistricts(formProvinceId) : [];

  // ─── Filter networks ─────────────────────────────────
  const filteredNetworks = networks.filter(n =>
    n.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Reset form ───────────────────────────────────────
  const resetForm = () => {
    setFormName("");
    setFormProvinceId("");
    setFormDistrict("");
    setFormLocation("");
    setFormIP("");
    setFormImageBase64(null);
    setFormManagerSearch("");
    setFormSelectedManager(null);
    setFormColor("#1B7A3D");
    setFormBgColor("#E8F5E9");
    setFormEmoji("📡");
  };

  // ─── Open add form ────────────────────────────────────
  const openAddForm = () => {
    resetForm();
    setShowAddForm(true);
  };

  // ─── Open edit form ───────────────────────────────────
  const openEditForm = (network: NetworkData) => {
    setEditingNetwork(network);
    setFormName(network.name);
    setFormProvinceId(network.provinceId || "");
    setFormDistrict(network.district || "");
    setFormLocation(network.exactLocation || "");
    setFormIP(network.connectionIP || "");
    setFormImageBase64(network.imageBase64);
    setFormColor(network.color);
    setFormBgColor(network.bgColor);
    setFormEmoji(network.emoji);
    if (network.ownerId) {
      setFormSelectedManager({
        uid: network.ownerId,
        displayName: network.ownerName || "",
        email: "",
        phone: network.ownerPhone || "",
      });
    } else {
      setFormSelectedManager(null);
    }
    setFormManagerSearch("");
  };

  // ─── Handle image upload ──────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن يكون أقل من 5 ميجابايت");
      return;
    }

    setUploading(true);
    try {
      const base64 = await compressImageToBase64(file, 256, 0.7);
      setFormImageBase64(base64);
      toast.success("تم رفع الصورة بنجاح");
    } catch (error) {
      toast.error("خطأ في رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  // ─── Save network (add or edit) ──────────────────────
  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("يرجى إدخال اسم الشبكة");
      return;
    }

    setSaving(true);
    try {
      const provinceObj = PROVINCES.find(p => p.id === formProvinceId);

      const networkData: Record<string, any> = {
        name: formName.trim(),
        color: formColor,
        bgColor: formBgColor,
        emoji: formEmoji,
        provinceId: formProvinceId || null,
        provinceName: provinceObj?.name || null,
        district: formDistrict || null,
        exactLocation: formLocation.trim() || null,
        connectionIP: formIP.trim() || null,
        imageBase64: formImageBase64 || null,
        ownerId: formSelectedManager?.uid || null,
        ownerName: formSelectedManager?.displayName || null,
        ownerPhone: formSelectedManager?.phone || null,
      };

      if (editingNetwork) {
        await update(ref(db, `networks/${editingNetwork.id}`), networkData);
        // Also update managedNetwork on user if manager changed
        if (formSelectedManager) {
          await update(ref(db, `users/${formSelectedManager.uid}`), {
            managedNetwork: editingNetwork.id,
          });
        }
        toast.success("تم تحديث الشبكة بنجاح");
        setEditingNetwork(null);
      } else {
        const newRef = push(ref(db, "networks"));
        networkData.createdAt = Date.now();
        await set(newRef, networkData);
        // Assign manager if selected
        if (formSelectedManager) {
          await update(ref(db, `users/${formSelectedManager.uid}`), {
            managedNetwork: newRef.key,
          });
        }
        toast.success("تم إضافة الشبكة بنجاح");
        setShowAddForm(false);
      }
      resetForm();
    } catch (error: any) {
      toast.error("خطأ: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete network ──────────────────────────────────
  const handleDelete = async () => {
    if (!deletingNetwork) return;
    try {
      await remove(ref(db, `networks/${deletingNetwork.id}`));
      toast.success("تم حذف الشبكة بنجاح");
      setDeletingNetwork(null);
    } catch (error: any) {
      toast.error("خطأ في حذف الشبكة: " + error.message);
    }
  };

  // ─── Form component ───────────────────────────────────
  const renderForm = (isEdit: boolean) => {
    const provinceObj = PROVINCES.find(p => p.id === formProvinceId);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {isEdit ? "تعديل الشبكة" : "إضافة شبكة جديدة"}
            </h3>
            <button
              onClick={() => { if (isEdit) setEditingNetwork(null); else setShowAddForm(false); resetForm(); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <div className="overflow-y-auto p-4 space-y-4 flex-1">
            {/* Network Name */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 block">اسم الشبكة *</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="مثال: Yemen Mobile"
                className="h-10 rounded-xl"
              />
            </div>

            {/* Icon Upload */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 block">أيقونة الشبكة</label>
              <div className="flex items-center gap-3">
                {formImageBase64 ? (
                  <div className="relative">
                    <img
                      src={formImageBase64}
                      alt="Network icon"
                      className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-200 dark:border-emerald-800"
                    />
                    <button
                      onClick={() => setFormImageBase64(null)}
                      className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-700 flex items-center justify-center hover:border-emerald-400 transition-colors"
                  >
                    {uploading ? (
                      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                )}
                <div className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="rounded-xl text-xs"
                  >
                    <ImageIcon className="w-3.5 h-3.5 ml-1.5" />
                    {uploading ? "جاري الرفع..." : "رفع أيقونة"}
                  </Button>
                  <p className="text-[10px] text-gray-400 mt-1">PNG أو JPG، الحد الأقصى 5 ميجابايت</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Province & District */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 block">المحافظة</label>
                <select
                  value={formProvinceId}
                  onChange={(e) => {
                    setFormProvinceId(e.target.value);
                    setFormDistrict("");
                  }}
                  className="w-full h-10 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="">اختر المحافظة</option>
                  {PROVINCES.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 block">المديرية</label>
                <select
                  value={formDistrict}
                  onChange={(e) => setFormDistrict(e.target.value)}
                  disabled={!formProvinceId}
                  className="w-full h-10 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50"
                >
                  <option value="">اختر المديرية</option>
                  {currentDistricts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 block">الموقع التفصيلي</label>
              <Input
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="العنوان التفصيلي للشبكة"
                className="h-10 rounded-xl"
              />
            </div>

            {/* IP Address */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 block">عنوان IP</label>
              <Input
                value={formIP}
                onChange={(e) => setFormIP(e.target.value)}
                placeholder="192.168.1.1"
                className="h-10 rounded-xl"
                dir="ltr"
              />
            </div>

            {/* Network Manager */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 block">مدير الشبكة</label>
              {formSelectedManager ? (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                    {formSelectedManager.displayName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{formSelectedManager.displayName}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{formSelectedManager.phone || formSelectedManager.email}</p>
                  </div>
                  <button
                    onClick={() => setFormSelectedManager(null)}
                    className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                  >
                    <X className="w-3.5 h-3.5 text-emerald-600" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={formManagerSearch}
                    onChange={(e) => setFormManagerSearch(e.target.value)}
                    placeholder="بحث عن مدير شبكة..."
                    className="h-10 rounded-xl"
                  />
                  {formManagerSearch && filteredManagers.length > 0 && (
                    <div className="max-h-32 overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-800">
                      {filteredManagers.map(m => (
                        <button
                          key={m.uid}
                          onClick={() => {
                            setFormSelectedManager(m);
                            setFormManagerSearch("");
                          }}
                          className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-right"
                        >
                          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <UserIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{m.displayName}</p>
                            <p className="text-[10px] text-gray-500 dark:text-slate-400">{m.phone || m.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {formManagerSearch && filteredManagers.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2">لا يوجد مديرين بهذا الاسم</p>
                  )}
                </div>
              )}
            </div>

            {/* Colors & Emoji */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 block">اللون</label>
                <input
                  type="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 cursor-pointer"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 block">لون الخلفية</label>
                <input
                  type="color"
                  value={formBgColor}
                  onChange={(e) => setFormBgColor(e.target.value)}
                  className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 cursor-pointer"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 block">الرمز التعبيري</label>
                <Input
                  value={formEmoji}
                  onChange={(e) => setFormEmoji(e.target.value)}
                  className="h-10 rounded-xl text-center text-lg"
                  maxLength={2}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-4 border-t border-gray-100 dark:border-slate-800 flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => { if (isEdit) setEditingNetwork(null); else setShowAddForm(false); resetForm(); }}
              className="flex-1 rounded-xl h-10"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formName.trim()}
              className="flex-1 rounded-xl h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? "جاري الحفظ..." : (
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  {isEdit ? "تحديث" : "إضافة"}
                </span>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">إدارة الشبكات</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {networks.length} شبكة مسجلة
          </p>
        </div>
        <Button
          onClick={openAddForm}
          className="rounded-xl h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4 ml-1.5" />
          إضافة شبكة
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث باسم الشبكة..."
          className="pr-10 h-11 rounded-xl bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800"
        />
      </div>

      {/* Networks Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-40 rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredNetworks.length === 0 ? (
        <div className="text-center py-12">
          <Wifi className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400 dark:text-slate-500">لا توجد شبكات</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNetworks.map((network, index) => (
            <motion.div
              key={network.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                {/* Network Icon */}
                <div className="flex-shrink-0">
                  {network.imageBase64 ? (
                    <img
                      src={network.imageBase64}
                      alt={network.name}
                      className="w-12 h-12 rounded-xl object-cover border border-gray-100 dark:border-slate-800"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                      style={{ backgroundColor: network.bgColor, color: network.color }}
                    >
                      {network.emoji}
                    </div>
                  )}
                </div>

                {/* Network Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">{network.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {network.provinceName && (
                      <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-slate-400">
                        <MapPin className="w-3 h-3" />
                        {network.provinceName}
                      </span>
                    )}
                    {network.district && (
                      <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-slate-400">
                        <Building2 className="w-3 h-3" />
                        {network.district}
                      </span>
                    )}
                    {network.connectionIP && (
                      <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-slate-400" dir="ltr">
                        <Globe className="w-3 h-3" />
                        {network.connectionIP}
                      </span>
                    )}
                  </div>
                  {network.ownerName && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <UserIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">{network.ownerName}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEditForm(network)}
                    className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"
                    title="تعديل"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingNetwork(network)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Form Modal */}
      {showAddForm && renderForm(false)}

      {/* Edit Form Modal */}
      {editingNetwork && renderForm(true)}

      {/* Delete Confirmation Modal */}
      {deletingNetwork && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden"
          >
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">تأكيد حذف الشبكة</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                هل أنت متأكد من حذف شبكة{" "}
                <span className="font-bold text-gray-900 dark:text-white">{deletingNetwork.name}</span>؟
                سيتم حذف جميع البيانات المرتبطة بها.
              </p>
            </div>
            <div className="flex items-center gap-2 p-4 border-t border-gray-100 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => setDeletingNetwork(null)}
                className="flex-1 rounded-xl h-10"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleDelete}
                className="flex-1 rounded-xl h-10 bg-red-500 hover:bg-red-600 text-white"
              >
                <span className="flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4" />
                  حذف
                </span>
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
