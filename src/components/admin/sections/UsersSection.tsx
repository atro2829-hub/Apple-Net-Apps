"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import { ref, set, get, push, update, remove, onValue, runTransaction } from "firebase/database";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users, Search, Edit3, Trash2, X, Mail, Phone, User as UserIcon,
  Shield, Wifi, ChevronRight, ChevronLeft, AlertTriangle, Check
} from "lucide-react";

interface UserData {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  role: "user" | "admin" | "network_manager";
  managedNetwork: string;
  balance: number;
  createdAt: number;
  isActive: boolean;
}

const ITEMS_PER_PAGE = 20;

export function UsersSection() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"user" | "admin" | "network_manager">("user");
  const [saving, setSaving] = useState(false);

  // ─── Real-time users listener ─────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, "users"), (snap) => {
      const data = snap.val() || {};
      const userList: UserData[] = Object.entries(data).map(([uid, v]: [string, any]) => ({
        uid,
        email: v.email || "",
        displayName: v.displayName || "",
        phone: v.phone || "",
        role: v.role || "user",
        managedNetwork: v.managedNetwork || "",
        balance: v.balance || 0,
        createdAt: v.createdAt || 0,
        isActive: v.isActive !== false,
      }));
      setUsers(userList.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ─── Filter users ─────────────────────────────────────
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.includes(q)
    );
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // ─── Edit user ────────────────────────────────────────
  const openEditModal = (user: UserData) => {
    setEditingUser(user);
    setEditName(user.displayName);
    setEditPhone(user.phone);
    setEditEmail(user.email);
    setEditRole(user.role);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await update(ref(db, `users/${editingUser.uid}`), {
        displayName: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        role: editRole,
      });
      toast.success("تم تحديث بيانات المستخدم بنجاح");
      setEditingUser(null);
    } catch (error: any) {
      toast.error("خطأ في تحديث البيانات: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete user ──────────────────────────────────────
  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      await remove(ref(db, `users/${deletingUser.uid}`));
      toast.success("تم حذف المستخدم بنجاح");
      setDeletingUser(null);
    } catch (error: any) {
      toast.error("خطأ في حذف المستخدم: " + error.message);
    }
  };

  // ─── Role badge helper ────────────────────────────────
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
            <Shield className="w-3 h-3" />
            مسؤول
          </span>
        );
      case "network_manager":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
            <Wifi className="w-3 h-3" />
            مدير شبكة
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            <UserIcon className="w-3 h-3" />
            مستخدم
          </span>
        );
    }
  };

  // ─── Format balance ───────────────────────────────────
  const formatBalance = (balance: number) => {
    return balance.toLocaleString("ar-YE");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">إدارة المستخدمين</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {filteredUsers.length} مستخدم مسجل
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث بالاسم أو البريد أو رقم الهاتف..."
          className="pr-10 h-11 rounded-xl bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800"
        />
      </div>

      {/* Users List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : paginatedUsers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400 dark:text-slate-500">لا يوجد مستخدمين</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedUsers.map((user, index) => (
            <motion.div
              key={user.uid}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {(user.displayName || user.email || "؟").charAt(0).toUpperCase()}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {user.displayName || "بدون اسم"}
                    </h3>
                    {getRoleBadge(user.role)}
                    {!user.isActive && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 dark:bg-gray-700 text-gray-500">
                        معطّل
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-gray-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {user.email || "—"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {user.phone || "—"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      {formatBalance(user.balance)} ريال
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEditModal(user)}
                    className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"
                    title="تعديل"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingUser(user)}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-slate-300" />
          </button>
          <span className="text-sm text-gray-600 dark:text-slate-400 font-medium">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-slate-300" />
          </button>
        </div>
      )}

      {/* ═══ Edit User Modal ═══ */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">تعديل بيانات المستخدم</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 block">الاسم</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="اسم المستخدم"
                  className="h-10 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 block">رقم الهاتف</label>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="7XXXXXXXX"
                  className="h-10 rounded-xl"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 block">البريد الإلكتروني</label>
                <Input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="h-10 rounded-xl"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 block">الدور</label>
                <div className="flex gap-2">
                  {[
                    { value: "user" as const, label: "مستخدم", color: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300" },
                    { value: "network_manager" as const, label: "مدير شبكة", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
                    { value: "admin" as const, label: "مسؤول", color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" },
                  ].map(role => (
                    <button
                      key={role.value}
                      onClick={() => setEditRole(role.value)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        editRole === role.value
                          ? `${role.color} ring-2 ring-emerald-500/50`
                          : "bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-4 border-t border-gray-100 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => setEditingUser(null)}
                className="flex-1 rounded-xl h-10"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 rounded-xl h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? "جاري الحفظ..." : (
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    حفظ التغييرات
                  </span>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══ Delete Confirmation Modal ═══ */}
      {deletingUser && (
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
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">تأكيد الحذف</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                هل أنت متأكد من حذف المستخدم{" "}
                <span className="font-bold text-gray-900 dark:text-white">{deletingUser.displayName || deletingUser.email}</span>؟
                لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>
            <div className="flex items-center gap-2 p-4 border-t border-gray-100 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => setDeletingUser(null)}
                className="flex-1 rounded-xl h-10"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleDeleteUser}
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
