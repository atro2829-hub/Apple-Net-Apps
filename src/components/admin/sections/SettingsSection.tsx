"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import {
  ref,
  set,
  get,
  push,
  update,
  remove,
  onValue,
  runTransaction,
} from "firebase/database";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compressImageToBase64 } from "@/lib/utils";
import {
  Settings as SettingsIcon,
  Save,
  Loader2,
  Phone,
  DollarSign,
  Wrench,
  Download,
  MessageSquare,
  Shield,
  Globe,
  MapPin,
  Wifi,
  Image as ImageIcon,
  Upload,
  X,
  Server,
  Zap,
  ChevronDown,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ───────────────────────────────────────────────
interface AppSettings {
  adminWhatsApp: string;
  maxBalance: number;
  maintenanceMode: boolean;
  appVersion: string;
  downloadUrl: string;
  updateMessage: string;
}

interface NetworkSettings {
  name: string;
  phone: string;
  province: string;
  district: string;
  location: string;
  IP: string;
  imageBase64: string;
  coverage: string;
  speed: string;
}

interface SettingsSectionProps {
  managedNetwork?: string;
}

// ─── Component ───────────────────────────────────────────
export function SettingsSection({ managedNetwork }: SettingsSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // App settings
  const [appSettings, setAppSettings] = useState<AppSettings>({
    adminWhatsApp: "",
    maxBalance: 0,
    maintenanceMode: false,
    appVersion: "",
    downloadUrl: "",
    updateMessage: "",
  });

  // Network settings
  const [networkSettings, setNetworkSettings] = useState<NetworkSettings>({
    name: "",
    phone: "",
    province: "",
    district: "",
    location: "",
    IP: "",
    imageBase64: "",
    coverage: "",
    speed: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Load settings ─────────────────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, "settings"), (snap) => {
      const data = snap.val() || {};
      setAppSettings({
        adminWhatsApp: data.adminWhatsApp || "",
        maxBalance: data.maxBalance || 0,
        maintenanceMode: data.maintenanceMode || false,
        appVersion: data.appVersion || "",
        downloadUrl: data.downloadUrl || "",
        updateMessage: data.updateMessage || "",
      });
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ─── Load network settings ─────────────────────────────
  useEffect(() => {
    if (!managedNetwork) return;
    const unsub = onValue(ref(db, `networks/${managedNetwork}`), (snap) => {
      const data = snap.val() || {};
      setNetworkSettings({
        name: data.name || "",
        phone: data.ownerPhone || data.phone || "",
        province: data.provinceName || "",
        district: data.district || "",
        location: data.exactLocation || "",
        IP: data.connectionIP || "",
        imageBase64: data.imageBase64 || "",
        coverage: data.coverage || "",
        speed: data.speed || "",
      });
    });
    return () => unsub();
  }, [managedNetwork]);

  // ─── Save app settings ─────────────────────────────────
  const handleSaveAppSettings = async () => {
    setSaving(true);
    try {
      await update(ref(db, "settings/"), {
        adminWhatsApp: appSettings.adminWhatsApp,
        maxBalance: Number(appSettings.maxBalance) || 0,
        maintenanceMode: appSettings.maintenanceMode,
        appVersion: appSettings.appVersion,
        downloadUrl: appSettings.downloadUrl,
        updateMessage: appSettings.updateMessage,
      });

      // Log activity
      const actRef = push(ref(db, "activityLog"));
      await set(actRef, {
        action: "settings_updated",
        user: auth.currentUser?.email || "admin",
        target: "إعدادات التطبيق",
        details: "تحديث إعدادات التطبيق",
        timestamp: Date.now(),
      });

      toast.success("تم حفظ الإعدادات بنجاح");
    } catch (err: any) {
      toast.error("حدث خطأ: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Save network settings ─────────────────────────────
  const handleSaveNetworkSettings = async () => {
    if (!managedNetwork) return;
    setSaving(true);
    try {
      await update(ref(db, `networks/${managedNetwork}`), {
        name: networkSettings.name,
        ownerPhone: networkSettings.phone,
        provinceName: networkSettings.province,
        district: networkSettings.district,
        exactLocation: networkSettings.location,
        connectionIP: networkSettings.IP,
        imageBase64: networkSettings.imageBase64,
        coverage: networkSettings.coverage,
        speed: networkSettings.speed,
      });

      // Log activity
      const actRef = push(ref(db, "activityLog"));
      await set(actRef, {
        action: "network_settings_updated",
        user: auth.currentUser?.email || "admin",
        target: networkSettings.name,
        details: "تحديث إعدادات الشبكة",
        timestamp: Date.now(),
      });

      toast.success("تم حفظ إعدادات الشبكة بنجاح");
    } catch (err: any) {
      toast.error("حدث خطأ: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Handle image upload ───────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImageToBase64(file, 512, 0.6);
      setNetworkSettings({ ...networkSettings, imageBase64: base64 });
    } catch {
      toast.error("فشل في رفع الصورة");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
          <SettingsIcon className="w-7 h-7 text-emerald-600" />
          {managedNetwork ? "إعدادات الشبكة" : "إعدادات التطبيق"}
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          {managedNetwork
            ? "تعديل إعدادات الشبكة الخاصة بك"
            : "إعدادات التطبيق العامة"}
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════
          APP SETTINGS (shown when no managedNetwork)
         ═══════════════════════════════════════════════════════ */}
      {!managedNetwork && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* General Settings */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6">
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-600" />
              الإعدادات العامة
            </h3>

            <div className="space-y-5">
              {/* Admin WhatsApp */}
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-emerald-500" />
                  واتساب الإدارة
                </label>
                <Input
                  placeholder="+9677XXXXXXXX"
                  value={appSettings.adminWhatsApp}
                  onChange={(e) =>
                    setAppSettings({
                      ...appSettings,
                      adminWhatsApp: e.target.value,
                    })
                  }
                  className="rounded-xl"
                  dir="ltr"
                />
              </div>

              {/* Max Balance */}
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  الحد الأقصى للرصيد (ريال)
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={appSettings.maxBalance || ""}
                  onChange={(e) =>
                    setAppSettings({
                      ...appSettings,
                      maxBalance: Number(e.target.value),
                    })
                  }
                  className="rounded-xl"
                  min="0"
                />
              </div>

              {/* Maintenance Mode */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      وضع الصيانة
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      تعطيل التطبيق للمستخدمين مؤقتاً
                    </p>
                  </div>
                </div>
                <Switch
                  checked={appSettings.maintenanceMode}
                  onCheckedChange={(val) =>
                    setAppSettings({ ...appSettings, maintenanceMode: val })
                  }
                />
              </div>
            </div>
          </div>

          {/* App Update Settings */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6">
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-600" />
              إعدادات التحديث
            </h3>

            <div className="space-y-5">
              {/* App Version */}
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  إصدار التطبيق
                </label>
                <Input
                  placeholder="1.0.0"
                  value={appSettings.appVersion}
                  onChange={(e) =>
                    setAppSettings({
                      ...appSettings,
                      appVersion: e.target.value,
                    })
                  }
                  className="rounded-xl"
                  dir="ltr"
                />
              </div>

              {/* Download URL */}
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-emerald-500" />
                  رابط التحميل
                </label>
                <Input
                  placeholder="https://..."
                  value={appSettings.downloadUrl}
                  onChange={(e) =>
                    setAppSettings({
                      ...appSettings,
                      downloadUrl: e.target.value,
                    })
                  }
                  className="rounded-xl"
                  dir="ltr"
                />
              </div>

              {/* Update Message */}
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  رسالة التحديث
                </label>
                <Textarea
                  placeholder="رسالة تظهر للمستخدمين عند وجود تحديث..."
                  value={appSettings.updateMessage}
                  onChange={(e) =>
                    setAppSettings({
                      ...appSettings,
                      updateMessage: e.target.value,
                    })
                  }
                  className="rounded-xl min-h-[80px]"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSaveAppSettings}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 px-8"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              حفظ الإعدادات
            </Button>
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════
          NETWORK SETTINGS (shown when managedNetwork is set)
         ═══════════════════════════════════════════════════════ */}
      {managedNetwork && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Network Info */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6">
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <Wifi className="w-5 h-5 text-emerald-600" />
              معلومات الشبكة
            </h3>

            <div className="space-y-5">
              {/* Network Image */}
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 block">
                  <ImageIcon className="w-4 h-4 inline ml-1" />
                  صورة الشبكة
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative h-40 bg-gray-50 dark:bg-slate-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 cursor-pointer hover:border-emerald-400 transition-colors overflow-hidden flex items-center justify-center"
                >
                  {networkSettings.imageBase64 ? (
                    <>
                      <img
                        src={networkSettings.imageBase64}
                        alt="Network"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNetworkSettings({
                            ...networkSettings,
                            imageBase64: "",
                          });
                        }}
                        className="absolute top-2 left-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        انقر لرفع صورة
                      </p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-500" />
                    اسم الشبكة
                  </label>
                  <Input
                    placeholder="اسم الشبكة"
                    value={networkSettings.name}
                    onChange={(e) =>
                      setNetworkSettings({
                        ...networkSettings,
                        name: e.target.value,
                      })
                    }
                    className="rounded-xl"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-emerald-500" />
                    رقم الهاتف
                  </label>
                  <Input
                    placeholder="+9677XXXXXXXX"
                    value={networkSettings.phone}
                    onChange={(e) =>
                      setNetworkSettings({
                        ...networkSettings,
                        phone: e.target.value,
                      })
                    }
                    className="rounded-xl"
                    dir="ltr"
                  />
                </div>

                {/* Province */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    المحافظة
                  </label>
                  <Input
                    placeholder="المحافظة"
                    value={networkSettings.province}
                    onChange={(e) =>
                      setNetworkSettings({
                        ...networkSettings,
                        province: e.target.value,
                      })
                    }
                    className="rounded-xl"
                  />
                </div>

                {/* District */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    المديرية
                  </label>
                  <Input
                    placeholder="المديرية"
                    value={networkSettings.district}
                    onChange={(e) =>
                      setNetworkSettings({
                        ...networkSettings,
                        district: e.target.value,
                      })
                    }
                    className="rounded-xl"
                  />
                </div>

                {/* Location */}
                <div className="sm:col-span-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    الموقع التفصيلي
                  </label>
                  <Input
                    placeholder="العنوان التفصيلي"
                    value={networkSettings.location}
                    onChange={(e) =>
                      setNetworkSettings({
                        ...networkSettings,
                        location: e.target.value,
                      })
                    }
                    className="rounded-xl"
                  />
                </div>

                {/* IP */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-emerald-500" />
                    عنوان IP
                  </label>
                  <Input
                    placeholder="192.168.1.1"
                    value={networkSettings.IP}
                    onChange={(e) =>
                      setNetworkSettings({
                        ...networkSettings,
                        IP: e.target.value,
                      })
                    }
                    className="rounded-xl"
                    dir="ltr"
                  />
                </div>

                {/* Coverage */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-500" />
                    التغطية
                  </label>
                  <Input
                    placeholder="مثال: 2 كم"
                    value={networkSettings.coverage}
                    onChange={(e) =>
                      setNetworkSettings({
                        ...networkSettings,
                        coverage: e.target.value,
                      })
                    }
                    className="rounded-xl"
                  />
                </div>

                {/* Speed */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-500" />
                    السرعة
                  </label>
                  <Input
                    placeholder="مثال: 50 Mbps"
                    value={networkSettings.speed}
                    onChange={(e) =>
                      setNetworkSettings({
                        ...networkSettings,
                        speed: e.target.value,
                      })
                    }
                    className="rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSaveNetworkSettings}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 px-8"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              حفظ إعدادات الشبكة
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
