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
  Globe,
  Plus,
  Pencil,
  Trash2,
  X,
  Server,
  Wifi,
  Package,
  ChevronDown,
  Link,
  Key,
  FileJson,
  MapPin,
  ToggleLeft,
  Upload,
  Tag,
  Hash,
  Clock,
  DollarSign,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  Layers,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface HeaderPair {
  key: string;
  value: string;
}

interface ResponseMapping {
  successField: string;
  messageField: string;
  transactionIdField: string;
}

interface TelecomProvider {
  id: string;
  name: string;
  nameEn: string;
  apiUrl: string;
  apiKey: string;
  method: "POST" | "GET";
  headers: HeaderPair[];
  bodyTemplate: string;
  responseMapping: ResponseMapping;
  balanceCheckUrl: string;
  isActive: boolean;
}

interface SubCategory {
  id: string;
  name: string;
  nameEn: string;
  regionCode: string;
}

interface TelecomNetwork {
  id: string;
  name: string;
  nameEn: string;
  color: string;
  bgColor: string;
  iconBase64: string;
  prefixes: string;
  providerId: string;
  subCategories: SubCategory[];
}

interface TelecomPackage {
  id: string;
  name: string;
  nameEn: string;
  price: number;
  wholesalePrice: number;
  description: string;
  descriptionEn: string;
  dataAmount: string;
  duration: number;
  durationUnit: "hours" | "days" | "months";
  type: "recharge" | "internet" | "voice";
  productCode: string;
  networkId: string;
  subCategoryId: string;
  isActive: boolean;
}

type SubView = "providers" | "networks" | "packages";

// ═══════════════════════════════════════════════════════════
// EMPTY TEMPLATES
// ═══════════════════════════════════════════════════════════

const emptyProvider: Omit<TelecomProvider, "id"> = {
  name: "",
  nameEn: "",
  apiUrl: "",
  apiKey: "",
  method: "POST",
  headers: [{ key: "", value: "" }],
  bodyTemplate: "",
  responseMapping: {
    successField: "",
    messageField: "",
    transactionIdField: "",
  },
  balanceCheckUrl: "",
  isActive: true,
};

const emptyNetwork: Omit<TelecomNetwork, "id"> = {
  name: "",
  nameEn: "",
  color: "#10b981",
  bgColor: "#ecfdf5",
  iconBase64: "",
  prefixes: "",
  providerId: "",
  subCategories: [],
};

const emptyPackage: Omit<TelecomPackage, "id"> = {
  name: "",
  nameEn: "",
  price: 0,
  wholesalePrice: 0,
  description: "",
  descriptionEn: "",
  dataAmount: "",
  duration: 1,
  durationUnit: "days",
  type: "internet",
  productCode: "",
  networkId: "",
  subCategoryId: "",
  isActive: true,
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function TelecomSection() {
  const [subView, setSubView] = useState<SubView>("providers");

  // ─── Providers State ──────────────────────────────────
  const [providers, setProviders] = useState<TelecomProvider[]>([]);
  const [providerModal, setProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] =
    useState<Omit<TelecomProvider, "id"> & { id?: string }>(emptyProvider);
  const [deleteProviderId, setDeleteProviderId] = useState<string | null>(null);

  // ─── Networks State ───────────────────────────────────
  const [networks, setNetworks] = useState<TelecomNetwork[]>([]);
  const [networkModal, setNetworkModal] = useState(false);
  const [editingNetwork, setEditingNetwork] =
    useState<Omit<TelecomNetwork, "id"> & { id?: string }>(emptyNetwork);
  const [deleteNetworkId, setDeleteNetworkId] = useState<string | null>(null);

  // ─── Packages State ───────────────────────────────────
  const [packages, setPackages] = useState<TelecomPackage[]>([]);
  const [packageModal, setPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] =
    useState<Omit<TelecomPackage, "id"> & { id?: string }>(emptyPackage);
  const [deletePackageId, setDeletePackageId] = useState<string | null>(null);
  const [filterNetworkId, setFilterNetworkId] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  // ─── Real-time Listeners ──────────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, "telecomProviders"), (snap) => {
      const data = snap.val() || {};
      const list: TelecomProvider[] = Object.entries(data).map(
        ([key, val]: [string, any]) => ({
          id: key,
          name: val.name || "",
          nameEn: val.nameEn || "",
          apiUrl: val.apiUrl || "",
          apiKey: val.apiKey || "",
          method: val.method || "POST",
          headers: val.headers || [],
          bodyTemplate: val.bodyTemplate || "",
          responseMapping: val.responseMapping || {
            successField: "",
            messageField: "",
            transactionIdField: "",
          },
          balanceCheckUrl: val.balanceCheckUrl || "",
          isActive: val.isActive !== false,
        })
      );
      setProviders(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, "telecomNetworks"), (snap) => {
      const data = snap.val() || {};
      const list: TelecomNetwork[] = Object.entries(data).map(
        ([key, val]: [string, any]) => ({
          id: key,
          name: val.name || "",
          nameEn: val.nameEn || "",
          color: val.color || "#10b981",
          bgColor: val.bgColor || "#ecfdf5",
          iconBase64: val.iconBase64 || "",
          prefixes: val.prefixes || "",
          providerId: val.providerId || "",
          subCategories: val.subCategories || [],
        })
      );
      setNetworks(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, "telecomPackages"), (snap) => {
      const data = snap.val() || {};
      const list: TelecomPackage[] = Object.entries(data).map(
        ([key, val]: [string, any]) => ({
          id: key,
          name: val.name || "",
          nameEn: val.nameEn || "",
          price: val.price || 0,
          wholesalePrice: val.wholesalePrice || 0,
          description: val.description || "",
          descriptionEn: val.descriptionEn || "",
          dataAmount: val.dataAmount || "",
          duration: val.duration || 1,
          durationUnit: val.durationUnit || "days",
          type: val.type || "internet",
          productCode: val.productCode || "",
          networkId: val.networkId || "",
          subCategoryId: val.subCategoryId || "",
          isActive: val.isActive !== false,
        })
      );
      setPackages(list);
    });
    return () => unsub();
  }, []);

  // ─── Provider CRUD ────────────────────────────────────
  const saveProvider = async () => {
    if (!editingProvider.name.trim()) {
      toast.error("يرجى إدخال اسم المزود");
      return;
    }
    try {
      const { id, ...data } = editingProvider;
      const cleanHeaders = (data.headers || []).filter(
        (h) => h.key.trim() || h.value.trim()
      );
      const payload = { ...data, headers: cleanHeaders };

      if (id) {
        await update(ref(db, `telecomProviders/${id}`), payload);
        toast.success("تم تحديث المزود بنجاح");
      } else {
        await push(ref(db, "telecomProviders"), payload);
        toast.success("تم إضافة المزود بنجاح");
      }
      setProviderModal(false);
      setEditingProvider(emptyProvider);
    } catch {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const deleteProvider = async (id: string) => {
    try {
      await remove(ref(db, `telecomProviders/${id}`));
      toast.success("تم حذف المزود بنجاح");
      setDeleteProviderId(null);
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  // ─── Network CRUD ────────────────────────────────────
  const saveNetwork = async () => {
    if (!editingNetwork.name.trim()) {
      toast.error("يرجى إدخال اسم الشبكة");
      return;
    }
    try {
      const { id, ...data } = editingNetwork;
      const payload = { ...data };

      if (id) {
        await update(ref(db, `telecomNetworks/${id}`), payload);
        toast.success("تم تحديث الشبكة بنجاح");
      } else {
        await push(ref(db, "telecomNetworks"), payload);
        toast.success("تم إضافة الشبكة بنجاح");
      }
      setNetworkModal(false);
      setEditingNetwork(emptyNetwork);
    } catch {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const deleteNetwork = async (id: string) => {
    try {
      await remove(ref(db, `telecomNetworks/${id}`));
      toast.success("تم حذف الشبكة بنجاح");
      setDeleteNetworkId(null);
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const handleNetworkIconUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImageToBase64(file, 256, 0.7);
      setEditingNetwork((prev) => ({ ...prev, iconBase64: base64 }));
      toast.success("تم رفع الأيقونة بنجاح");
    } catch {
      toast.error("حدث خطأ في رفع الأيقونة");
    }
  };

  const addSubCategory = () => {
    setEditingNetwork((prev) => ({
      ...prev,
      subCategories: [
        ...prev.subCategories,
        {
          id: Date.now().toString(),
          name: "",
          nameEn: "",
          regionCode: "",
        },
      ],
    }));
  };

  const removeSubCategory = (idx: number) => {
    setEditingNetwork((prev) => ({
      ...prev,
      subCategories: prev.subCategories.filter((_, i) => i !== idx),
    }));
  };

  const updateSubCategory = (
    idx: number,
    field: keyof SubCategory,
    value: string
  ) => {
    setEditingNetwork((prev) => ({
      ...prev,
      subCategories: prev.subCategories.map((sc, i) =>
        i === idx ? { ...sc, [field]: value } : sc
      ),
    }));
  };

  // ─── Package CRUD ────────────────────────────────────
  const savePackage = async () => {
    if (!editingPackage.name.trim()) {
      toast.error("يرجى إدخال اسم الباقة");
      return;
    }
    if (!editingPackage.networkId) {
      toast.error("يرجى اختيار الشبكة");
      return;
    }
    try {
      const { id, ...data } = editingPackage;
      const payload = { ...data };

      if (id) {
        await update(ref(db, `telecomPackages/${id}`), payload);
        toast.success("تم تحديث الباقة بنجاح");
      } else {
        await push(ref(db, "telecomPackages"), payload);
        toast.success("تم إضافة الباقة بنجاح");
      }
      setPackageModal(false);
      setEditingPackage(emptyPackage);
    } catch {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const deletePackage = async (id: string) => {
    try {
      await remove(ref(db, `telecomPackages/${id}`));
      toast.success("تم حذف الباقة بنجاح");
      setDeletePackageId(null);
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  // ─── Helper: Get network name ────────────────────────
  const getNetworkName = (networkId: string) =>
    networks.find((n) => n.id === networkId)?.name || "—";

  const getProviderName = (providerId: string) =>
    providers.find((p) => p.id === providerId)?.name || "—";

  const getSelectedNetworkSubCategories = (): SubCategory[] => {
    if (!editingPackage.networkId) return [];
    const net = networks.find((n) => n.id === editingPackage.networkId);
    return net?.subCategories || [];
  };

  // ─── Filtered packages ───────────────────────────────
  const filteredPackages = packages.filter((pkg) => {
    if (filterNetworkId !== "all" && pkg.networkId !== filterNetworkId)
      return false;
    if (filterType !== "all" && pkg.type !== filterType) return false;
    return true;
  });

  // ─── Sub-nav buttons ─────────────────────────────────
  const subNavItems: { key: SubView; label: string; icon: React.ElementType }[] = [
    { key: "providers", label: "مزودين", icon: Server },
    { key: "networks", label: "شبكات", icon: Wifi },
    { key: "packages", label: "باقات", icon: Package },
  ];

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════

  return (
    <div className="space-y-6" dir="rtl">
      {/* ─── Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">
              الاتصالات
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              إدارة المزودين والشبكات والباقات
            </p>
          </div>
        </div>
      </div>

      {/* ─── Sub-navigation ────────────────────────────── */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-slate-800/50 rounded-xl">
        {subNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = subView === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setSubView(item.key)}
              className={`
                flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold
                transition-all duration-200
                ${
                  isActive
                    ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* ─── Content ──────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={subView}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {subView === "providers" && (
            <ProvidersView
              providers={providers}
              onAdd={() => {
                setEditingProvider(emptyProvider);
                setProviderModal(true);
              }}
              onEdit={(p) => {
                setEditingProvider(p);
                setProviderModal(true);
              }}
              onDelete={(id) => setDeleteProviderId(id)}
            />
          )}
          {subView === "networks" && (
            <NetworksView
              networks={networks}
              providers={providers}
              getProviderName={getProviderName}
              onAdd={() => {
                setEditingNetwork(emptyNetwork);
                setNetworkModal(true);
              }}
              onEdit={(n) => {
                setEditingNetwork(n);
                setNetworkModal(true);
              }}
              onDelete={(id) => setDeleteNetworkId(id)}
            />
          )}
          {subView === "packages" && (
            <PackagesView
              packages={filteredPackages}
              networks={networks}
              getNetworkName={getNetworkName}
              filterNetworkId={filterNetworkId}
              filterType={filterType}
              onFilterNetwork={setFilterNetworkId}
              onFilterType={setFilterType}
              onAdd={() => {
                setEditingPackage(emptyPackage);
                setPackageModal(true);
              }}
              onEdit={(p) => {
                setEditingPackage(p);
                setPackageModal(true);
              }}
              onDelete={(id) => setDeletePackageId(id)}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* ═══ Provider Modal ═══════════════════════════════ */}
      <AnimatePresence>
        {providerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setProviderModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  {editingProvider.id ? "تعديل المزود" : "إضافة مزود جديد"}
                </h3>
                <button
                  onClick={() => setProviderModal(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Row: name / nameEn */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block">
                      الاسم (عربي)
                    </label>
                    <Input
                      value={editingProvider.name}
                      onChange={(e) =>
                        setEditingProvider((p) => ({
                          ...p,
                          name: e.target.value,
                        }))
                      }
                      placeholder="اسم المزود"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block">
                      الاسم (إنجليزي)
                    </label>
                    <Input
                      value={editingProvider.nameEn}
                      onChange={(e) =>
                        setEditingProvider((p) => ({
                          ...p,
                          nameEn: e.target.value,
                        }))
                      }
                      placeholder="Provider Name"
                    />
                  </div>
                </div>

                {/* API URL */}
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <Link className="w-3 h-3" />
                    رابط API
                  </label>
                  <Input
                    value={editingProvider.apiUrl}
                    onChange={(e) =>
                      setEditingProvider((p) => ({
                        ...p,
                        apiUrl: e.target.value,
                      }))
                    }
                    placeholder="https://api.example.com/charge"
                    dir="ltr"
                  />
                </div>

                {/* API Key */}
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    مفتاح API
                  </label>
                  <Input
                    value={editingProvider.apiKey}
                    onChange={(e) =>
                      setEditingProvider((p) => ({
                        ...p,
                        apiKey: e.target.value,
                      }))
                    }
                    placeholder="API Key"
                    dir="ltr"
                  />
                </div>

                {/* Method */}
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block">
                    طريقة الطلب
                  </label>
                  <div className="flex gap-2">
                    {(["POST", "GET"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() =>
                          setEditingProvider((p) => ({ ...p, method: m }))
                        }
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                          editingProvider.method === m
                            ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                            : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Headers */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 flex items-center gap-1">
                      <FileJson className="w-3 h-3" />
                      Headers
                    </label>
                    <button
                      onClick={() =>
                        setEditingProvider((p) => ({
                          ...p,
                          headers: [
                            ...(p.headers || []),
                            { key: "", value: "" },
                          ],
                        }))
                      }
                      className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                    >
                      + إضافة حقل
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(editingProvider.headers || []).map((h, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Input
                          value={h.key}
                          onChange={(e) => {
                            const newHeaders = [
                              ...editingProvider.headers,
                            ];
                            newHeaders[i] = {
                              ...newHeaders[i],
                              key: e.target.value,
                            };
                            setEditingProvider((p) => ({
                              ...p,
                              headers: newHeaders,
                            }));
                          }}
                          placeholder="Key"
                          className="flex-1"
                          dir="ltr"
                        />
                        <Input
                          value={h.value}
                          onChange={(e) => {
                            const newHeaders = [
                              ...editingProvider.headers,
                            ];
                            newHeaders[i] = {
                              ...newHeaders[i],
                              value: e.target.value,
                            };
                            setEditingProvider((p) => ({
                              ...p,
                              headers: newHeaders,
                            }));
                          }}
                          placeholder="Value"
                          className="flex-1"
                          dir="ltr"
                        />
                        <button
                          onClick={() => {
                            const newHeaders =
                              editingProvider.headers.filter(
                                (_, idx) => idx !== i
                              );
                            setEditingProvider((p) => ({
                              ...p,
                              headers: newHeaders,
                            }));
                          }}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Body Template */}
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block">
                    قالب Body
                  </label>
                  <textarea
                    value={editingProvider.bodyTemplate}
                    onChange={(e) =>
                      setEditingProvider((p) => ({
                        ...p,
                        bodyTemplate: e.target.value,
                      }))
                    }
                    placeholder='{"phone": "{{phone}}", "amount": "{{amount}}"}'
                    dir="ltr"
                    rows={4}
                    className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 dark:bg-slate-800/50"
                  />
                </div>

                {/* Response Mapping */}
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2 block flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    تعيين حقول الاستجابة
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-400 mb-1 block">
                        حقل النجاح
                      </label>
                      <Input
                        value={editingProvider.responseMapping.successField}
                        onChange={(e) =>
                          setEditingProvider((p) => ({
                            ...p,
                            responseMapping: {
                              ...p.responseMapping,
                              successField: e.target.value,
                            },
                          }))
                        }
                        placeholder="status"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 mb-1 block">
                        حقل الرسالة
                      </label>
                      <Input
                        value={editingProvider.responseMapping.messageField}
                        onChange={(e) =>
                          setEditingProvider((p) => ({
                            ...p,
                            responseMapping: {
                              ...p.responseMapping,
                              messageField: e.target.value,
                            },
                          }))
                        }
                        placeholder="message"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 mb-1 block">
                        حقل رقم العملية
                      </label>
                      <Input
                        value={
                          editingProvider.responseMapping.transactionIdField
                        }
                        onChange={(e) =>
                          setEditingProvider((p) => ({
                            ...p,
                            responseMapping: {
                              ...p.responseMapping,
                              transactionIdField: e.target.value,
                            },
                          }))
                        }
                        placeholder="txn_id"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                {/* Balance Check URL */}
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block">
                    رابط فحص الرصيد
                  </label>
                  <Input
                    value={editingProvider.balanceCheckUrl}
                    onChange={(e) =>
                      setEditingProvider((p) => ({
                        ...p,
                        balanceCheckUrl: e.target.value,
                      }))
                    }
                    placeholder="https://api.example.com/balance"
                    dir="ltr"
                  />
                </div>

                {/* isActive */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl">
                  <span className="text-sm font-bold text-gray-700 dark:text-slate-300 flex items-center gap-2">
                    <ToggleLeft className="w-4 h-4 text-emerald-500" />
                    حالة التفعيل
                  </span>
                  <button
                    onClick={() =>
                      setEditingProvider((p) => ({
                        ...p,
                        isActive: !p.isActive,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      editingProvider.isActive
                        ? "bg-emerald-500"
                        : "bg-gray-300 dark:bg-slate-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                        editingProvider.isActive
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
                  onClick={saveProvider}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                >
                  {editingProvider.id ? "تحديث" : "إضافة"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setProviderModal(false)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Network Modal ═══════════════════════════════ */}
      <AnimatePresence>
        {networkModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setNetworkModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  {editingNetwork.id ? "تعديل الشبكة" : "إضافة شبكة جديدة"}
                </h3>
                <button
                  onClick={() => setNetworkModal(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Row: name / nameEn */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block">
                      الاسم (عربي)
                    </label>
                    <Input
                      value={editingNetwork.name}
                      onChange={(e) =>
                        setEditingNetwork((p) => ({
                          ...p,
                          name: e.target.value,
                        }))
                      }
                      placeholder="اسم الشبكة"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block">
                      الاسم (إنجليزي)
                    </label>
                    <Input
                      value={editingNetwork.nameEn}
                      onChange={(e) =>
                        setEditingNetwork((p) => ({
                          ...p,
                          nameEn: e.target.value,
                        }))
                      }
                      placeholder="Network Name"
                    />
                  </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block">
                      اللون الرئيسي
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editingNetwork.color}
                        onChange={(e) =>
                          setEditingNetwork((p) => ({
                            ...p,
                            color: e.target.value,
                          }))
                        }
                        className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                      />
                      <Input
                        value={editingNetwork.color}
                        onChange={(e) =>
                          setEditingNetwork((p) => ({
                            ...p,
                            color: e.target.value,
                          }))
                        }
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block">
                      لون الخلفية
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editingNetwork.bgColor}
                        onChange={(e) =>
                          setEditingNetwork((p) => ({
                            ...p,
                            bgColor: e.target.value,
                          }))
                        }
                        className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                      />
                      <Input
                        value={editingNetwork.bgColor}
                        onChange={(e) =>
                          setEditingNetwork((p) => ({
                            ...p,
                            bgColor: e.target.value,
                          }))
                        }
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                {/* Icon Upload */}
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    أيقونة الشبكة
                  </label>
                  <div className="flex items-center gap-4">
                    {editingNetwork.iconBase64 && (
                      <img
                        src={editingNetwork.iconBase64}
                        alt="Network icon"
                        className="w-14 h-14 rounded-xl object-cover border border-gray-200 dark:border-slate-700"
                      />
                    )}
                    <label className="cursor-pointer px-4 py-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors text-sm font-medium text-gray-500 dark:text-slate-400">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleNetworkIconUpload}
                        className="hidden"
                      />
                      رفع أيقونة
                    </label>
                    {editingNetwork.iconBase64 && (
                      <button
                        onClick={() =>
                          setEditingNetwork((p) => ({
                            ...p,
                            iconBase64: "",
                          }))
                        }
                        className="text-xs text-red-500 hover:underline"
                      >
                        إزالة
                      </button>
                    )}
                  </div>
                </div>

                {/* Prefixes */}
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    البادئات (مفصولة بفواصل)
                  </label>
                  <Input
                    value={editingNetwork.prefixes}
                    onChange={(e) =>
                      setEditingNetwork((p) => ({
                        ...p,
                        prefixes: e.target.value,
                      }))
                    }
                    placeholder="770, 771, 773"
                    dir="ltr"
                  />
                </div>

                {/* Provider Dropdown */}
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block">
                    المزود
                  </label>
                  <div className="relative">
                    <select
                      value={editingNetwork.providerId}
                      onChange={(e) =>
                        setEditingNetwork((p) => ({
                          ...p,
                          providerId: e.target.value,
                        }))
                      }
                      className="w-full h-10 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                      <option value="">— اختر المزود —</option>
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.nameEn})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Sub Categories */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      التصنيفات الفرعية
                    </label>
                    <button
                      onClick={addSubCategory}
                      className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                    >
                      + إضافة تصنيف
                    </button>
                  </div>
                  <div className="space-y-3">
                    {editingNetwork.subCategories.map((sc, i) => (
                      <div
                        key={sc.id}
                        className="flex gap-2 items-start p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl"
                      >
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <Input
                            value={sc.name}
                            onChange={(e) =>
                              updateSubCategory(i, "name", e.target.value)
                            }
                            placeholder="الاسم عربي"
                            className="text-xs"
                          />
                          <Input
                            value={sc.nameEn}
                            onChange={(e) =>
                              updateSubCategory(i, "nameEn", e.target.value)
                            }
                            placeholder="Name EN"
                            className="text-xs"
                            dir="ltr"
                          />
                          <Input
                            value={sc.regionCode}
                            onChange={(e) =>
                              updateSubCategory(
                                i,
                                "regionCode",
                                e.target.value
                              )
                            }
                            placeholder="رمز المنطقة"
                            className="text-xs"
                            dir="ltr"
                          />
                        </div>
                        <button
                          onClick={() => removeSubCategory(i)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 mt-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {editingNetwork.subCategories.length === 0 && (
                      <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-2">
                        لا توجد تصنيفات فرعية
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-white dark:bg-slate-900 p-5 border-t border-gray-100 dark:border-slate-800 flex gap-3">
                <Button
                  onClick={saveNetwork}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                >
                  {editingNetwork.id ? "تحديث" : "إضافة"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setNetworkModal(false)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Package Modal ═══════════════════════════════ */}
      <AnimatePresence>
        {packageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPackageModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  {editingPackage.id ? "تعديل الباقة" : "إضافة باقة جديدة"}
                </h3>
                <button
                  onClick={() => setPackageModal(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Row: name / nameEn */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block">
                      الاسم (عربي)
                    </label>
                    <Input
                      value={editingPackage.name}
                      onChange={(e) =>
                        setEditingPackage((p) => ({
                          ...p,
                          name: e.target.value,
                        }))
                      }
                      placeholder="اسم الباقة"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block">
                      الاسم (إنجليزي)
                    </label>
                    <Input
                      value={editingPackage.nameEn}
                      onChange={(e) =>
                        setEditingPackage((p) => ({
                          ...p,
                          nameEn: e.target.value,
                        }))
                      }
                      placeholder="Package Name"
                    />
                  </div>
                </div>

                {/* Price / Wholesale */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      السعر
                    </label>
                    <Input
                      type="number"
                      value={editingPackage.price}
                      onChange={(e) =>
                        setEditingPackage((p) => ({
                          ...p,
                          price: Number(e.target.value),
                        }))
                      }
                      placeholder="0"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      سعر الجملة
                    </label>
                    <Input
                      type="number"
                      value={editingPackage.wholesalePrice}
                      onChange={(e) =>
                        setEditingPackage((p) => ({
                          ...p,
                          wholesalePrice: Number(e.target.value),
                        }))
                      }
                      placeholder="0"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block">
                      الوصف (عربي)
                    </label>
                    <textarea
                      value={editingPackage.description}
                      onChange={(e) =>
                        setEditingPackage((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                      placeholder="وصف الباقة"
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 dark:bg-slate-800/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block">
                      الوصف (إنجليزي)
                    </label>
                    <textarea
                      value={editingPackage.descriptionEn}
                      onChange={(e) =>
                        setEditingPackage((p) => ({
                          ...p,
                          descriptionEn: e.target.value,
                        }))
                      }
                      placeholder="Package description"
                      rows={2}
                      dir="ltr"
                      className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 dark:bg-slate-800/50"
                    />
                  </div>
                </div>

                {/* Data Amount / Duration */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block">
                      حجم البيانات
                    </label>
                    <Input
                      value={editingPackage.dataAmount}
                      onChange={(e) =>
                        setEditingPackage((p) => ({
                          ...p,
                          dataAmount: e.target.value,
                        }))
                      }
                      placeholder="5 GB"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      المدة
                    </label>
                    <Input
                      type="number"
                      value={editingPackage.duration}
                      onChange={(e) =>
                        setEditingPackage((p) => ({
                          ...p,
                          duration: Number(e.target.value),
                        }))
                      }
                      placeholder="1"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block">
                      وحدة المدة
                    </label>
                    <div className="relative">
                      <select
                        value={editingPackage.durationUnit}
                        onChange={(e) =>
                          setEditingPackage((p) => ({
                            ...p,
                            durationUnit: e.target.value as any,
                          }))
                        }
                        className="w-full h-10 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      >
                        <option value="hours">ساعات</option>
                        <option value="days">أيام</option>
                        <option value="months">أشهر</option>
                      </select>
                      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Type / Product Code */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block">
                      النوع
                    </label>
                    <div className="flex gap-2">
                      {(
                        [
                          { val: "recharge", label: "شحن" },
                          { val: "internet", label: "إنترنت" },
                          { val: "voice", label: "مكالمات" },
                        ] as const
                      ).map((t) => (
                        <button
                          key={t.val}
                          onClick={() =>
                            setEditingPackage((p) => ({
                              ...p,
                              type: t.val,
                            }))
                          }
                          className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                            editingPackage.type === t.val
                              ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                              : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      كود المنتج
                    </label>
                    <Input
                      value={editingPackage.productCode}
                      onChange={(e) =>
                        setEditingPackage((p) => ({
                          ...p,
                          productCode: e.target.value,
                        }))
                      }
                      placeholder="PKG-001"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Network / SubCategory */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block">
                      الشبكة
                    </label>
                    <div className="relative">
                      <select
                        value={editingPackage.networkId}
                        onChange={(e) =>
                          setEditingPackage((p) => ({
                            ...p,
                            networkId: e.target.value,
                            subCategoryId: "",
                          }))
                        }
                        className="w-full h-10 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      >
                        <option value="">— اختر الشبكة —</option>
                        {networks.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.name} ({n.nameEn})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block">
                      التصنيف الفرعي
                    </label>
                    <div className="relative">
                      <select
                        value={editingPackage.subCategoryId}
                        onChange={(e) =>
                          setEditingPackage((p) => ({
                            ...p,
                            subCategoryId: e.target.value,
                          }))
                        }
                        className="w-full h-10 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      >
                        <option value="">— اختر التصنيف —</option>
                        {getSelectedNetworkSubCategories().map((sc) => (
                          <option key={sc.id} value={sc.id}>
                            {sc.name} ({sc.nameEn})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* isActive */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl">
                  <span className="text-sm font-bold text-gray-700 dark:text-slate-300 flex items-center gap-2">
                    <ToggleLeft className="w-4 h-4 text-emerald-500" />
                    حالة التفعيل
                  </span>
                  <button
                    onClick={() =>
                      setEditingPackage((p) => ({
                        ...p,
                        isActive: !p.isActive,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      editingPackage.isActive
                        ? "bg-emerald-500"
                        : "bg-gray-300 dark:bg-slate-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                        editingPackage.isActive
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
                  onClick={savePackage}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                >
                  {editingPackage.id ? "تحديث" : "إضافة"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPackageModal(false)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Delete Confirmation Dialogs ═════════════════ */}
      <AnimatePresence>
        {deleteProviderId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDeleteProviderId(null)}
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
                هل أنت متأكد من حذف هذا المزود؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => deleteProvider(deleteProviderId)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold"
                >
                  حذف
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeleteProviderId(null)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteNetworkId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDeleteNetworkId(null)}
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
                هل أنت متأكد من حذف هذه الشبكة؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => deleteNetwork(deleteNetworkId)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold"
                >
                  حذف
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeleteNetworkId(null)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletePackageId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDeletePackageId(null)}
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
                هل أنت متأكد من حذف هذه الباقة؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => deletePackage(deletePackageId)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold"
                >
                  حذف
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeletePackageId(null)}
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

// ═══════════════════════════════════════════════════════════
// PROVIDERS VIEW
// ═══════════════════════════════════════════════════════════

function ProvidersView({
  providers,
  onAdd,
  onEdit,
  onDelete,
}: {
  providers: TelecomProvider[];
  onAdd: () => void;
  onEdit: (p: TelecomProvider) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {providers.length} مزود
        </p>
        <Button
          onClick={onAdd}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold gap-2"
        >
          <Plus className="w-4 h-4" />
          إضافة مزود
        </Button>
      </div>

      {providers.length === 0 ? (
        <div className="text-center py-16">
          <Server className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400 dark:text-slate-500">
            لا يوجد مزودين حتى الآن
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <motion.div
              key={provider.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-800 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Server className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                      {provider.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {provider.nameEn}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    provider.isActive
                      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                  }`}
                >
                  {provider.isActive ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  {provider.isActive ? "مفعّل" : "معطّل"}
                </span>
              </div>

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                  <Link className="w-3 h-3" />
                  <span className="truncate" dir="ltr">
                    {provider.apiUrl || "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      provider.method === "POST"
                        ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600"
                        : "bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                    }`}
                  >
                    {provider.method}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(provider)}
                  className="flex-1 gap-1 text-xs"
                >
                  <Pencil className="w-3 h-3" />
                  تعديل
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(provider.id)}
                  className="gap-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// NETWORKS VIEW
// ═══════════════════════════════════════════════════════════

function NetworksView({
  networks,
  providers,
  getProviderName,
  onAdd,
  onEdit,
  onDelete,
}: {
  networks: TelecomNetwork[];
  providers: TelecomProvider[];
  getProviderName: (id: string) => string;
  onAdd: () => void;
  onEdit: (n: TelecomNetwork) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {networks.length} شبكة
        </p>
        <Button
          onClick={onAdd}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold gap-2"
        >
          <Plus className="w-4 h-4" />
          إضافة شبكة
        </Button>
      </div>

      {networks.length === 0 ? (
        <div className="text-center py-16">
          <Wifi className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400 dark:text-slate-500">
            لا توجد شبكات حتى الآن
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {networks.map((network) => (
            <motion.div
              key={network.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-gray-200 dark:border-slate-800 p-4 hover:shadow-lg transition-all overflow-hidden relative"
            >
              {/* Color accent bar */}
              <div
                className="absolute top-0 right-0 left-0 h-1 rounded-t-xl"
                style={{ backgroundColor: network.color }}
              />

              <div className="flex items-start justify-between mb-3 pt-1">
                <div className="flex items-center gap-3">
                  {network.iconBase64 ? (
                    <img
                      src={network.iconBase64}
                      alt={network.name}
                      className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-slate-700"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: network.bgColor || "#ecfdf5",
                      }}
                    >
                      <Wifi
                        className="w-5 h-5"
                        style={{ color: network.color || "#10b981" }}
                      />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                      {network.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {network.nameEn}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                  <Server className="w-3 h-3" />
                  <span>المزود: {getProviderName(network.providerId)}</span>
                </div>
                {network.prefixes && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                    <Hash className="w-3 h-3" />
                    <span dir="ltr">{network.prefixes}</span>
                  </div>
                )}
                {network.subCategories && network.subCategories.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                    <Layers className="w-3 h-3" />
                    <span>
                      {network.subCategories.length} تصنيف فرعي
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(network)}
                  className="flex-1 gap-1 text-xs"
                >
                  <Pencil className="w-3 h-3" />
                  تعديل
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(network.id)}
                  className="gap-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PACKAGES VIEW
// ═══════════════════════════════════════════════════════════

function PackagesView({
  packages,
  networks,
  getNetworkName,
  filterNetworkId,
  filterType,
  onFilterNetwork,
  onFilterType,
  onAdd,
  onEdit,
  onDelete,
}: {
  packages: TelecomPackage[];
  networks: TelecomNetwork[];
  getNetworkName: (id: string) => string;
  filterNetworkId: string;
  filterType: string;
  onFilterNetwork: (id: string) => void;
  onFilterType: (type: string) => void;
  onAdd: () => void;
  onEdit: (p: TelecomPackage) => void;
  onDelete: (id: string) => void;
}) {
  const typeLabels: Record<string, string> = {
    recharge: "شحن",
    internet: "إنترنت",
    voice: "مكالمات",
  };

  const durationUnitLabels: Record<string, string> = {
    hours: "ساعة",
    days: "يوم",
    months: "شهر",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {packages.length} باقة
        </p>
        <Button
          onClick={onAdd}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold gap-2"
        >
          <Plus className="w-4 h-4" />
          إضافة باقة
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={filterNetworkId}
            onChange={(e) => onFilterNetwork(e.target.value)}
            className="w-full h-10 pr-9 pl-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="all">كل الشبكات</option>
            {networks.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <select
            value={filterType}
            onChange={(e) => onFilterType(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="all">كل الأنواع</option>
            <option value="recharge">شحن</option>
            <option value="internet">إنترنت</option>
            <option value="voice">مكالمات</option>
          </select>
          <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {packages.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400 dark:text-slate-500">
            لا توجد باقات حتى الآن
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => {
            const network = networks.find((n) => n.id === pkg.networkId);
            return (
              <motion.div
                key={pkg.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 hover:shadow-lg transition-all overflow-hidden relative"
              >
                {/* Color accent */}
                <div
                  className="absolute top-0 right-0 left-0 h-1 rounded-t-xl"
                  style={{
                    backgroundColor: network?.color || "#10b981",
                  }}
                />

                <div className="flex items-start justify-between mb-3 pt-1">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                      {pkg.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {pkg.nameEn}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        pkg.isActive
                          ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                          : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                      }`}
                    >
                      {pkg.isActive ? "مفعّل" : "معطّل"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {/* Price */}
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {pkg.price.toLocaleString()} ر.ي
                    </span>
                    {pkg.wholesalePrice > 0 && (
                      <span className="text-xs text-gray-400 line-through">
                        {pkg.wholesalePrice.toLocaleString()} ر.ي
                      </span>
                    )}
                  </div>

                  {/* Data & Duration */}
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                    {pkg.dataAmount && (
                      <span className="flex items-center gap-1">
                        <Wifi className="w-3 h-3" />
                        {pkg.dataAmount}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {pkg.duration} {durationUnitLabels[pkg.durationUnit] || pkg.durationUnit}
                    </span>
                  </div>

                  {/* Network & Type */}
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        backgroundColor: network?.bgColor || "#ecfdf5",
                        color: network?.color || "#10b981",
                      }}
                    >
                      {getNetworkName(pkg.networkId)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400">
                      {typeLabels[pkg.type] || pkg.type}
                    </span>
                  </div>

                  {pkg.productCode && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
                      <Tag className="w-3 h-3" />
                      <span dir="ltr">{pkg.productCode}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(pkg)}
                    className="flex-1 gap-1 text-xs"
                  >
                    <Pencil className="w-3 h-3" />
                    تعديل
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDelete(pkg.id)}
                    className="gap-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
