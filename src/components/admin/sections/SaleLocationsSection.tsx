"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import { ref, set, get, push, update, remove, onValue } from "firebase/database";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PROVINCES, getDistricts } from "@/lib/constants";
import {
  Plus, Pencil, Trash2, X, Store, Search, MapPin, Phone, Wifi
} from "lucide-react";

interface SaleLocation {
  id: string;
  name: string;
  networkId: string;
  provinceId: string;
  district: string;
  exactLocation: string;
  phone: string;
  isActive: boolean;
}

interface SaleLocationsSectionProps {
  managedNetwork?: string;
}

export function SaleLocationsSection({ managedNetwork }: SaleLocationsSectionProps) {
  const [locations, setLocations] = useState<SaleLocation[]>([]);
  const [networks, setNetworks] = useState<{ id: string; name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProvince, setFilterProvince] = useState("all");
  const [form, setForm] = useState({
    name: "", networkId: managedNetwork || "", provinceId: "", district: "",
    exactLocation: "", phone: "", isActive: true,
  });

  useEffect(() => {
    const unsub1 = onValue(ref(db, "saleLocations"), (snap) => {
      const data = snap.val() || {};
      setLocations(Object.entries(data).map(([id, v]: [string, any]) => ({ id, ...v })));
    });
    const unsub2 = onValue(ref(db, "networks"), (snap) => {
      const data = snap.val() || {};
      setNetworks(Object.entries(data).map(([id, v]: [string, any]) => ({ id, name: v.name || id })));
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const resetForm = () => {
    setForm({ name: "", networkId: managedNetwork || "", provinceId: "", district: "", exactLocation: "", phone: "", isActive: true });
    setEditingId(null); setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("الاسم مطلوب"); return; }
    if (!managedNetwork && !form.networkId) { toast.error("الشبكة مطلوبة"); return; }
    try {
      const data = { ...form, networkId: managedNetwork || form.networkId };
      if (editingId) {
        await update(ref(db, `saleLocations/${editingId}`), data);
        toast.success("تم تحديث الموقع");
      } else {
        await push(ref(db, "saleLocations"), data);
        toast.success("تم إضافة الموقع");
      }
      resetForm();
    } catch { toast.error("حدث خطأ"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الموقع؟")) return;
    try { await remove(ref(db, `saleLocations/${id}`)); toast.success("تم حذف الموقع"); }
    catch { toast.error("حدث خطأ"); }
  };

  const toggleActive = async (loc: SaleLocation) => {
    try {
      await update(ref(db, `saleLocations/${loc.id}`), { isActive: !loc.isActive });
      toast.success(loc.isActive ? "تم تعطيل الموقع" : "تم تفعيل الموقع");
    } catch { toast.error("حدث خطأ"); }
  };

  const startEdit = (loc: SaleLocation) => {
    setForm({
      name: loc.name || "", networkId: managedNetwork || loc.networkId || "",
      provinceId: loc.provinceId || "", district: loc.district || "",
      exactLocation: loc.exactLocation || "", phone: loc.phone || "",
      isActive: loc.isActive ?? true,
    });
    setEditingId(loc.id); setShowForm(true);
  };

  const filteredLocations = locations.filter(loc => {
    if (managedNetwork && loc.networkId !== managedNetwork) return false;
    if (filterProvince !== "all" && loc.provinceId !== filterProvince) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return loc.name?.toLowerCase().includes(q) ||
        loc.district?.toLowerCase().includes(q) ||
        loc.exactLocation?.toLowerCase().includes(q) ||
        loc.phone?.includes(q);
    }
    return true;
  });

  const getProvinceName = (id: string) => PROVINCES.find(p => p.id === id)?.name || id;
  const getNetworkName = (id: string) => networks.find(n => n.id === id)?.name || id;
  const districts = form.provinceId ? getDistricts(form.provinceId) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Store className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">مواقع البيع</h2>
            <p className="text-sm text-gray-500">إدارة مواقع بيع البطاقات</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="w-4 h-4 ml-1" /> إضافة موقع
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="بحث..." className="pr-9" />
        </div>
        <select value={filterProvince} onChange={e => setFilterProvince(e.target.value)}
          className="h-9 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm">
          <option value="all">كل المحافظات</option>
          {PROVINCES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-gray-900 dark:text-white">{editingId ? "تعديل الموقع" : "إضافة موقع جديد"}</h4>
                <button onClick={resetForm} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">اسم الموقع</label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: مكتب النور" />
                </div>
                {!managedNetwork && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">الشبكة</label>
                    <select value={form.networkId} onChange={e => setForm(f => ({ ...f, networkId: e.target.value }))}
                      className="w-full h-9 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm">
                      <option value="">-- اختر الشبكة --</option>
                      {networks.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">المحافظة</label>
                  <select value={form.provinceId} onChange={e => setForm(f => ({ ...f, provinceId: e.target.value, district: "" }))}
                    className="w-full h-9 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm">
                    <option value="">-- اختر المحافظة --</option>
                    {PROVINCES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">المديرية</label>
                  <select value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
                    className="w-full h-9 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm">
                    <option value="">-- اختر المديرية --</option>
                    {districts.map((d, i) => <option key={i} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">الموقع الدقيق</label>
                  <Input value={form.exactLocation} onChange={e => setForm(f => ({ ...f, exactLocation: e.target.value }))} placeholder="شركة كذا، شارع كذا" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">رقم الهاتف</label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="777123456" dir="ltr" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
                  <label className="text-sm text-gray-700 dark:text-slate-300">{form.isActive ? "نشط" : "غير نشط"}</label>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white">{editingId ? "تحديث" : "إضافة"}</Button>
                <Button variant="outline" onClick={resetForm}>إلغاء</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {filteredLocations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Store className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>لا توجد مواقع بيع بعد</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredLocations.map((loc) => (
            <motion.div key={loc.id} layout className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{loc.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                    {!managedNetwork && <span className="flex items-center gap-1"><Wifi className="w-3 h-3" /> {getNetworkName(loc.networkId)}</span>}
                    <span>{getProvinceName(loc.provinceId)} • {loc.district}</span>
                    {loc.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {loc.phone}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={loc.isActive ?? true} onCheckedChange={() => toggleActive(loc)} />
                <button onClick={() => startEdit(loc)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(loc.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
