"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Eye, EyeOff, Mail, Lock, CheckCircle2, Shield, Loader2
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { toast } from "sonner";
import { sanitizeInput, isValidEmail } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

interface AdminAuthFormProps {
  onSuccess: () => void;
}

// Firebase error code to i18n translation key mapping
const FIREBASE_ERROR_KEYS: Record<string, string> = {
  "auth/wrong-password": "adminAuth.wrongPassword",
  "auth/user-not-found": "adminAuth.userNotFound",
  "auth/invalid-email": "adminAuth.invalidEmail",
  "auth/too-many-requests": "adminAuth.tooManyRequests",
  "auth/invalid-credential": "adminAuth.invalidCredential",
  "auth/network-request-failed": "adminAuth.networkError",
};

function getLocalizedError(err: unknown, t: (path: string) => string): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: string }).code;
    if (FIREBASE_ERROR_KEYS[code]) return t(FIREBASE_ERROR_KEYS[code]);
  }
  if (err instanceof Error) {
    for (const [code, key] of Object.entries(FIREBASE_ERROR_KEYS)) {
      if (err.message.includes(code)) return t(key);
    }
    return err.message;
  }
  return t("adminAuth.unexpectedError");
}

export function AdminAuthForm({ onSuccess }: AdminAuthFormProps) {
  const { t, isRTL } = useLanguage();
  const isAr = isRTL;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // ─── Login ──────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = sanitizeInput(email.trim());
    if (!cleanEmail || !password) {
      toast.error(isAr ? "أدخل البريد وكلمة المرور" : "Enter email and password");
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      toast.error(isAr ? "البريد الإلكتروني غير صالح" : "Invalid email");
      return;
    }
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
      toast.success(isAr ? "تم تسجيل الدخول بنجاح" : "Logged in successfully");
      onSuccess();
    } catch (err: unknown) {
      toast.error(getLocalizedError(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Password Reset ────────────────────────────────────
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = sanitizeInput(email.trim());
    if (!cleanEmail) {
      toast.error(isAr ? "أدخل بريدك الإلكتروني أولاً" : "Enter your email first");
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      toast.error(isAr ? "البريد الإلكتروني غير صالح" : "Invalid email");
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setResetSent(true);
      toast.success(isAr ? "تم إرسال رابط إعادة التعيين" : "Reset link sent");
    } catch (err: unknown) {
      toast.error(getLocalizedError(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {resetMode ? (
        <motion.div
          key="reset"
          initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
          transition={{ duration: 0.2 }}
        >
          {resetSent ? (
            <div className="text-center py-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </motion.div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {isAr ? "تم الإرسال بنجاح!" : "Sent Successfully!"}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {isAr ? "تم إرسال رابط إعادة تعيين كلمة المرور إلى" : "Password reset link sent to"}
              </p>
              <p className="text-sm font-semibold text-green-600 mb-4">{email}</p>
              <p className="text-xs text-gray-400 mb-6">
                {isAr ? "تحقق من صندوق الوارد والبريد غير المرغوب فيه" : "Check your inbox and spam folder"}
              </p>
              <Button
                variant="outline"
                className="w-full rounded-2xl h-11"
                onClick={() => { setResetMode(false); setResetSent(false); }}
              >
                {isAr ? "العودة لتسجيل الدخول" : "Back to Login"}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {isAr ? "نسيت كلمة المرور؟" : "Forgot Password?"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {isAr ? "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين" : "Enter your email and we'll send a reset link"}
                </p>
              </div>

              <div className="relative">
                <Mail className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-gray-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={isAr ? "البريد الإلكتروني" : "Email address"}
                  className="h-11 pr-10 pl-4 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                  dir="ltr"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-xl bg-[#1B7A3D] hover:bg-[#166833] text-white font-bold"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  isAr ? "إرسال رابط التعيين" : "Send Reset Link"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full h-10 text-sm text-gray-500"
                onClick={() => setResetMode(false)}
              >
                {isAr ? "العودة لتسجيل الدخول" : "Back to Login"}
              </Button>
            </form>
          )}
        </motion.div>
      ) : (
        <motion.div
          key="login"
          initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isRTL ? -20 : 20 }}
          transition={{ duration: 0.2 }}
        >
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div className="relative">
              <Mail className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-gray-400" />
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={isAr ? "البريد الإلكتروني" : "Email address"}
                className="h-11 pr-10 pl-4 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                dir="ltr"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-gray-400" />
              <Input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isAr ? "كلمة المرور" : "Password"}
                className="h-11 pr-10 pl-10 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                dir="ltr"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setResetMode(true)}
                className="text-xs text-[#1B7A3D] hover:underline font-medium"
              >
                {isAr ? "نسيت كلمة المرور؟" : "Forgot Password?"}
              </button>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-2xl bg-[#1B7A3D] hover:bg-[#166833] text-white font-bold text-base shadow-lg shadow-green-900/20"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4 ml-2" />
                  {isAr ? "تسجيل الدخول" : "Sign In"}
                </>
              )}
            </Button>

            {/* Info Notice */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mt-4">
              <p className="text-xs text-amber-700 dark:text-amber-300 text-center leading-relaxed">
                {isAr
                  ? "⚠️ هذا التطبيق مخصص فقط للمسؤولين ومديري الشبكات. يتم التحقق من الصلاحيات عبر Firebase."
                  : "⚠️ This app is for admins and network managers only. Permissions are verified via Firebase."}
              </p>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
