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
  Satellite,
  Plus,
  Pencil,
  Trash2,
  Package,
  ShoppingCart,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  Truck,
  PackageCheck,
  Clock,
  ArrowDownToLine,
  ArrowUpFromLine,
  Timer,
  Globe,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ───────────────────────────────────────────────
interface StarlinkProduct {
  id: string;
  name: string;
  description: string;
  priceUSD: number;
  quantity: number;
  imageUrl: string;
  imageBase64?: string;
  specs: {
    downloadSpeed: string;
    uploadSpeed: string;
    latency: string;
    coverage: string;
  };
  isActive: boolean;
  createdAt: number;
}

interface StarlinkOrder {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  productId: string;
  productName: string;
  priceUSD: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  createdAt: number;
}

// ─── Status Config ───────────────────────────────────────
const ORDER_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: {
    label: "قيد الانتظار",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    icon: Clock,
  },
  confirmed: {
    label: "مؤكد",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: CheckCircle2,
  },
  shipped: {
    label: "تم الشحن",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    icon: Truck,
  },
  delivered: {
    label: "تم التسليم",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    icon: PackageCheck,
  },
  cancelled: {
    label: "ملغي",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    icon: XCircle,
  },
};

// ─── Component ───────────────────────────────────────────
export function StarlinkSection() {
  const [activeTab, setActiveTab] = useState<"products" | "orders">("products");
  const [products, setProducts] = useState<StarlinkProduct[]>([]);
  const [orders, setOrders] = useState<StarlinkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<StarlinkProduct | null>(null);
  const [editingProduct, setEditingProduct] = useState<StarlinkProduct | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    priceUSD: "",
    quantity: "",
    downloadSpeed: "",
    uploadSpeed: "",
    latency: "",
    coverage: "",
    isActive: true,
  });

  // ─── Load products ─────────────────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, "starlinkProducts"), (snap) => {
      const data = snap.val() || {};
      const list: StarlinkProduct[] = Object.entries(data)
        .map(([key, val]: [string, any]) => ({
          id: key,
          ...val,
        }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setProducts(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ─── Load orders ───────────────────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, "starlinkOrders"), (snap) => {
      const data = snap.val() || {};
      const list: StarlinkOrder[] = Object.entries(data)
        .map(([key, val]: [string, any]) => ({
          id: key,
          ...val,
        }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setOrders(list);
    });
    return () => unsub();
  }, []);

  // ─── Handle image upload ───────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImageToBase64(file, 512, 0.6);
      setImagePreview(base64);
    } catch {
      toast.error("فشل في رفع الصورة");
    }
  };

  // ─── Open add product dialog ───────────────────────────
  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: "",
      description: "",
      priceUSD: "",
      quantity: "",
      downloadSpeed: "",
      uploadSpeed: "",
      latency: "",
      coverage: "",
      isActive: true,
    });
    setImagePreview("");
    setDialogOpen(true);
  };

  // ─── Open edit product dialog ──────────────────────────
  const openEditProduct = (product: StarlinkProduct) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name || "",
      description: product.description || "",
      priceUSD: product.priceUSD?.toString() || "",
      quantity: product.quantity?.toString() || "",
      downloadSpeed: product.specs?.downloadSpeed || "",
      uploadSpeed: product.specs?.uploadSpeed || "",
      latency: product.specs?.latency || "",
      coverage: product.specs?.coverage || "",
      isActive: product.isActive ?? true,
    });
    setImagePreview(product.imageBase64 || product.imageUrl || "");
    setDialogOpen(true);
  };

  // ─── Save product ──────────────────────────────────────
  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.priceUSD) {
      toast.error("يرجى ملء الحقول المطلوبة");
      return;
    }

    setSubmitting(true);
    try {
      const productData = {
        name: productForm.name,
        description: productForm.description,
        priceUSD: Number(productForm.priceUSD),
        quantity: Number(productForm.quantity) || 0,
        imageBase64: imagePreview || "",
        imageUrl: "",
        specs: {
          downloadSpeed: productForm.downloadSpeed,
          uploadSpeed: productForm.uploadSpeed,
          latency: productForm.latency,
          coverage: productForm.coverage,
        },
        isActive: productForm.isActive,
      };

      if (editingProduct) {
        await update(ref(db, `starlinkProducts/${editingProduct.id}`), productData);
        toast.success("تم تحديث المنتج بنجاح");
      } else {
        const newRef = push(ref(db, "starlinkProducts"));
        await set(newRef, {
          ...productData,
          createdAt: Date.now(),
        });
        toast.success("تم إضافة المنتج بنجاح");
      }

      // Log activity
      const actRef = push(ref(db, "activityLog"));
      await set(actRef, {
        action: editingProduct ? "starlink_product_updated" : "starlink_product_added",
        user: auth.currentUser?.email || "admin",
        target: productForm.name,
        details: `${productForm.name} - $${productForm.priceUSD}`,
        timestamp: Date.now(),
      });

      setDialogOpen(false);
    } catch (err: any) {
      toast.error("حدث خطأ: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Delete product ────────────────────────────────────
  const handleDeleteProduct = async () => {
    if (!deleteDialog) return;
    setSubmitting(true);
    try {
      await remove(ref(db, `starlinkProducts/${deleteDialog.id}`));
      toast.success("تم حذف المنتج بنجاح");
      setDeleteDialog(null);
    } catch (err: any) {
      toast.error("حدث خطأ: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Toggle product active ─────────────────────────────
  const toggleActive = async (product: StarlinkProduct) => {
    try {
      await update(ref(db, `starlinkProducts/${product.id}`), {
        isActive: !product.isActive,
      });
      toast.success(product.isActive ? "تم تعطيل المنتج" : "تم تفعيل المنتج");
    } catch (err: any) {
      toast.error("حدث خطأ: " + err.message);
    }
  };

  // ─── Update order status ───────────────────────────────
  const updateOrderStatus = async (
    order: StarlinkOrder,
    newStatus: StarlinkOrder["status"]
  ) => {
    try {
      await update(ref(db, `starlinkOrders/${order.id}`), {
        status: newStatus,
      });

      const notifRef = push(ref(db, `users/${order.userId}/notifications`));
      const statusMessages: Record<string, { title: string; message: string }> = {
        confirmed: { title: "تم تأكيد الطلب", message: `تم تأكيد طلب Starlink: ${order.productName}` },
        shipped: { title: "تم شحن الطلب", message: `تم شحن طلب Starlink: ${order.productName}` },
        delivered: { title: "تم التسليم", message: `تم تسليم طلب Starlink: ${order.productName}` },
        cancelled: { title: "تم إلغاء الطلب", message: `تم إلغاء طلب Starlink: ${order.productName}` },
      };
      const msg = statusMessages[newStatus];
      if (msg) {
        await set(notifRef, {
          type: "general",
          title: msg.title,
          message: msg.message,
          isRead: false,
          createdAt: Date.now(),
          relatedId: order.id,
        });
      }

      toast.success("تم تحديث حالة الطلب");
    } catch (err: any) {
      toast.error("حدث خطأ: " + err.message);
    }
  };

  const getNextStatus = (current: StarlinkOrder["status"]): StarlinkOrder["status"] | null => {
    const flow: Record<string, StarlinkOrder["status"]> = {
      pending: "confirmed",
      confirmed: "shipped",
      shipped: "delivered",
    };
    return flow[current] || null;
  };

  const formatDate = (ts: number) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("ar-YE", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const pendingOrdersCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Satellite className="w-7 h-7 text-emerald-600" />
            Starlink
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            إدارة منتجات وطلبات Starlink
          </p>
        </div>
        {activeTab === "products" && (
          <Button
            onClick={openAddProduct}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5"
          >
            <Plus className="w-4 h-4" />
            إضافة منتج
          </Button>
        )}
      </div>

      {/* ─── Tab Navigation ──────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
        <button
          onClick={() => setActiveTab("products")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${
            activeTab === "products"
              ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
          }`}
        >
          <Package className="w-4 h-4" />
          المنتجات
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all relative ${
            activeTab === "orders"
              ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          الطلبات
          {pendingOrdersCount > 0 && (
            <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
              {pendingOrdersCount}
            </span>
          )}
        </button>
      </div>

      {/* ─── Products Tab ────────────────────────────────── */}
      {activeTab === "products" && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <Satellite className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-slate-400 font-semibold">لا توجد منتجات</p>
              <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">أضف منتج Starlink جديد للبدء</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((product, idx) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Product Image */}
                  <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 relative overflow-hidden">
                    {product.imageBase64 || product.imageUrl ? (
                      <img src={product.imageBase64 || product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Satellite className="w-12 h-12 text-gray-300 dark:text-slate-600" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <button
                        onClick={() => toggleActive(product)}
                        className={`p-1.5 rounded-lg backdrop-blur-sm ${
                          product.isActive ? "bg-emerald-500/80 text-white" : "bg-gray-500/50 text-white"
                        }`}
                      >
                        {product.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="absolute top-3 right-3 flex items-center gap-1">
                      <button
                        onClick={() => openEditProduct(product)}
                        className="p-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-gray-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteDialog(product)}
                        className="p-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {!product.isActive && (
                      <div className="absolute bottom-0 left-0 right-0 bg-red-500/80 text-white text-center text-xs font-bold py-1 backdrop-blur-sm">
                        معطّل
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-base font-black text-gray-900 dark:text-white">{product.name}</h3>
                      <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">${product.priceUSD}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2 mb-3">{product.description}</p>

                    {/* Specs */}
                    <div className="grid grid-cols-2 gap-2">
                      {product.specs?.downloadSpeed && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-400">
                          <ArrowDownToLine className="w-3 h-3 text-emerald-500" />
                          <span>تنزيل: {product.specs.downloadSpeed}</span>
                        </div>
                      )}
                      {product.specs?.uploadSpeed && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-400">
                          <ArrowUpFromLine className="w-3 h-3 text-blue-500" />
                          <span>رفع: {product.specs.uploadSpeed}</span>
                        </div>
                      )}
                      {product.specs?.latency && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-400">
                          <Timer className="w-3 h-3 text-purple-500" />
                          <span>استجابة: {product.specs.latency}</span>
                        </div>
                      )}
                      {product.specs?.coverage && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-400">
                          <Globe className="w-3 h-3 text-amber-500" />
                          <span>تغطية: {product.specs.coverage}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                      <span>الكمية: {product.quantity}</span>
                      <span>{formatDate(product.createdAt)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Orders Tab ──────────────────────────────────── */}
      {activeTab === "orders" && (
        <>
          {orders.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <ShoppingCart className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-slate-400 font-semibold">لا توجد طلبات</p>
            </motion.div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-340px)] overflow-y-auto scrollbar-thin">
              {orders.map((order, idx) => {
                const statusConfig = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
                const StatusIcon = statusConfig.icon;
                const nextStatus = getNextStatus(order.status);

                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 ${
                      order.status === "pending" ? "border-amber-300 dark:border-amber-700" : "border-gray-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                          <p className="text-gray-600 dark:text-slate-400">
                            <span className="text-gray-400 dark:text-slate-500">المنتج: </span>
                            <span className="font-semibold text-gray-900 dark:text-white">{order.productName}</span>
                          </p>
                          <p className="text-gray-600 dark:text-slate-400">
                            <span className="text-gray-400 dark:text-slate-500">السعر: </span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">${order.priceUSD}</span>
                          </p>
                          <p className="text-gray-600 dark:text-slate-400">
                            <span className="text-gray-400 dark:text-slate-500">العميل: </span>
                            {order.userName}
                          </p>
                          <p className="text-gray-600 dark:text-slate-400">
                            <span className="text-gray-400 dark:text-slate-500">الهاتف: </span>
                            {order.userPhone || "—"}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-slate-500 col-span-2">{formatDate(order.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {nextStatus && (
                          <Button
                            size="sm"
                            onClick={() => updateOrderStatus(order, nextStatus)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1 text-xs"
                          >
                            {nextStatus === "confirmed" && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {nextStatus === "shipped" && <Truck className="w-3.5 h-3.5" />}
                            {nextStatus === "delivered" && <PackageCheck className="w-3.5 h-3.5" />}
                            {ORDER_STATUS[nextStatus]?.label}
                          </Button>
                        )}
                        {order.status !== "cancelled" && order.status !== "delivered" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateOrderStatus(order, "cancelled")}
                            className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 rounded-xl gap-1 text-xs"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            إلغاء
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── Add/Edit Product Dialog ─────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <Satellite className="w-5 h-5" />
              {editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Image Upload */}
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 block">صورة المنتج</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative h-36 bg-gray-50 dark:bg-slate-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 cursor-pointer hover:border-emerald-400 transition-colors overflow-hidden flex items-center justify-center"
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setImagePreview(""); }}
                      className="absolute top-2 left-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-slate-400">انقر لرفع صورة</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
                اسم المنتج <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="مثال: Starlink Standard"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">الوصف</label>
              <Textarea
                placeholder="وصف المنتج..."
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                className="rounded-xl min-h-[60px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
                  السعر (USD) <span className="text-red-500">*</span>
                </label>
                <Input type="number" placeholder="0" value={productForm.priceUSD}
                  onChange={(e) => setProductForm({ ...productForm, priceUSD: e.target.value })}
                  className="rounded-xl" min="0" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">الكمية</label>
                <Input type="number" placeholder="0" value={productForm.quantity}
                  onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                  className="rounded-xl" min="0" />
              </div>
            </div>

            {/* Specs */}
            <div className="space-y-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
              <p className="text-sm font-bold text-gray-700 dark:text-slate-300">المواصفات التقنية</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1 block">
                    <ArrowDownToLine className="w-3 h-3 inline ml-1" />سرعة التنزيل
                  </label>
                  <Input placeholder="مثال: 200 Mbps" value={productForm.downloadSpeed}
                    onChange={(e) => setProductForm({ ...productForm, downloadSpeed: e.target.value })}
                    className="rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1 block">
                    <ArrowUpFromLine className="w-3 h-3 inline ml-1" />سرعة الرفع
                  </label>
                  <Input placeholder="مثال: 30 Mbps" value={productForm.uploadSpeed}
                    onChange={(e) => setProductForm({ ...productForm, uploadSpeed: e.target.value })}
                    className="rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1 block">
                    <Timer className="w-3 h-3 inline ml-1" />وقت الاستجابة
                  </label>
                  <Input placeholder="مثال: 20ms" value={productForm.latency}
                    onChange={(e) => setProductForm({ ...productForm, latency: e.target.value })}
                    className="rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1 block">
                    <Globe className="w-3 h-3 inline ml-1" />التغطية
                  </label>
                  <Input placeholder="مثال: يمن كامل" value={productForm.coverage}
                    onChange={(e) => setProductForm({ ...productForm, coverage: e.target.value })}
                    className="rounded-xl text-sm" />
                </div>
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
              <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">تفعيل المنتج</span>
              <Switch
                checked={productForm.isActive}
                onCheckedChange={(val) => setProductForm({ ...productForm, isActive: val })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">إلغاء</Button>
            <Button onClick={handleSaveProduct} disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {editingProduct ? "حفظ التعديلات" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─────────────────────────── */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => { if (!open) setDeleteDialog(null); }}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              تأكيد حذف المنتج
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-slate-400 py-2">
            هل أنت متأكد من حذف <span className="font-bold text-gray-900 dark:text-white">{deleteDialog?.name}</span>؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog(null)} className="rounded-xl">إلغاء</Button>
            <Button onClick={handleDeleteProduct} disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl gap-1">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
