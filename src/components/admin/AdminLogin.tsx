"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Eye, EyeOff, Mail, Lock, Shield, Loader2, Fingerprint, CheckCircle2, AlertCircle, KeyRound
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { ref, get } from "firebase/database";
import { toast } from "sonner";
import { sanitizeInput, isValidEmail } from "@/lib/utils";

// ─── Firebase error mapping ──────────────────────────────
const FIREBASE_ERROR_AR: Record<string, string> = {
  "auth/wrong-password": "كلمة المرور غير صحيحة",
  "auth/user-not-found": "المستخدم غير موجود",
  "auth/invalid-email": "البريد الإلكتروني غير صالح",
  "auth/too-many-requests": "محاولات كثيرة، حاول لاحقاً",
  "auth/invalid-credential": "بيانات الدخول غير صحيحة",
  "auth/network-request-failed": "خطأ في الاتصال بالشبكة",
  "auth/user-disabled": "تم تعطيل هذا الحساب",
};

function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: string }).code;
    return FIREBASE_ERROR_AR[code] || "حدث خطأ غير متوقع";
  }
  return "حدث خطأ غير متوقع";
}

// ─── Biometric Auth ─────────────────────────────────────
async function checkBiometricAvailable(): Promise<boolean> {
  try {
    if (typeof window !== "undefined" && "Capacitor" in window) {
      const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
      const result = await BiometricAuth.checkAvailability();
      return result.isAvailable;
    }
  } catch {
    // Not available
  }
  return false;
}

async function authenticateWithBiometric(): Promise<boolean> {
  try {
    if (typeof window !== "undefined" && "Capacitor" in window) {
      const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
      await BiometricAuth.authenticate({
        reason: "تسجيل الدخول إلى لوحة إدارة Apple.NET",
        title: "Apple.NET Admin",
        subtitle: "تأكيد الهوية",
        cancelTitle: "إلغاء",
        fallbackTitle: "استخدام كلمة المرور",
      });
      return true;
    }
  } catch {
    // Biometric failed or cancelled
  }
  return false;
}

// ─── Secure credential storage ──────────────────────────
const CREDS_EMAIL_KEY = "applenet_admin_email";
const CREDS_FLAG_KEY = "applenet_admin_has_creds";
const CREDS_PASS_KEY = "applenet_admin_enc_pass";

function saveCredentials(email: string, password: string): void {
  try {
    localStorage.setItem(CREDS_EMAIL_KEY, email);
    localStorage.setItem(CREDS_FLAG_KEY, "true");
    // Simple encoding (not truly secure, but better than plain text)
    const encoded = btoa(unescape(encodeURIComponent(password)));
    localStorage.setItem(CREDS_PASS_KEY, encoded);
  } catch {
    // Storage not available
  }
}

function getSavedCredentials(): { email: string; password: string } | null {
  try {
    const hasCreds = localStorage.getItem(CREDS_FLAG_KEY);
    if (!hasCreds) return null;
    const email = localStorage.getItem(CREDS_EMAIL_KEY);
    const encoded = localStorage.getItem(CREDS_PASS_KEY);
    if (!email || !encoded) return null;
    const password = decodeURIComponent(escape(atob(encoded)));
    return { email, password };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// COMPONENT - Professional Admin Login
// ═══════════════════════════════════════════════════════════
export function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [hasSavedCreds, setHasSavedCreds] = useState(false);

  // Check biometric and saved credentials
  useEffect(() => {
    checkBiometricAvailable().then(available => {
      setBiometricAvailable(available);
      if (available) {
        const creds = getSavedCredentials();
        if (creds) {
          setHasSavedCreds(true);
          setEmail(creds.email);
        }
      }
    });
  }, []);

  // ─── Email/Password Login ──────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = sanitizeInput(email.trim());
    if (!cleanEmail || !password) {
      toast.error("أدخل البريد وكلمة المرور");
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      toast.error("البريد الإلكتروني غير صالح");
      return;
    }
    setSubmitting(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      // Verify admin role
      const roleSnapshot = await get(ref(db, `users/${userCredential.user.uid}/role`));
      const role = roleSnapshot.val();
      if (role !== "admin" && role !== "network_manager") {
        await auth.signOut();
        toast.error("ليس لديك صلاحيات إدارية");
        return;
      }
      // Save credentials for biometric next time
      saveCredentials(cleanEmail, password);
      setHasSavedCreds(true);
      toast.success("تم تسجيل الدخول بنجاح");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Biometric Login ───────────────────────────────────
  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    try {
      const authenticated = await authenticateWithBiometric();
      if (!authenticated) {
        toast.error("فشل التحقق بالبصمة");
        return;
      }

      const creds = getSavedCredentials();
      if (creds) {
        await signInWithEmailAndPassword(auth, creds.email, creds.password);
        toast.success("تم تسجيل الدخول بالبصمة");
      } else {
        toast.error("لا توجد بيانات محفوظة. سجل دخولك أولاً بالبريد وكلمة المرور");
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setBiometricLoading(false);
    }
  };

  // ─── Password Reset ────────────────────────────────────
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = sanitizeInput(email.trim());
    if (!cleanEmail) {
      toast.error("أدخل بريدك الإلكتروني أولاً");
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      toast.error("البريد الإلكتروني غير صالح");
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setResetSent(true);
      toast.success("تم إرسال رابط إعادة التعيين");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900" dir="rtl">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }} />
      </div>

      {/* Top Section - Logo & Branding */}
      <div className="flex-shrink-0 pt-12 pb-8 flex flex-col items-center relative z-10">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="flex flex-col items-center gap-4"
        >
          {/* Logo Icon */}
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl">
            <Shield className="w-10 h-10 text-white" />
          </div>

          {/* Brand */}
          <div className="text-center">
            <h1 className="text-2xl font-black text-white tracking-tight">Apple.NET</h1>
            <p className="text-emerald-200 text-sm font-medium mt-1">لوحة الإدارة والتحكم</p>
          </div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/20"
          >
            <Lock className="w-3.5 h-3.5 text-emerald-200" />
            <span className="text-white/90 text-xs font-bold">دخول مصرح فقط</span>
          </motion.div>
        </motion.div>
      </div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="flex-1 bg-white dark:bg-slate-900 rounded-t-[2rem] shadow-2xl relative z-10 overflow-hidden"
      >
        <div className="p-6 pt-8 max-w-md mx-auto">
          <AnimatePresence mode="wait">
            {resetMode ? (
              /* ─── Password Reset Mode ─── */
              <motion.div
                key="reset"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                {resetSent ? (
                  <div className="text-center py-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4"
                    >
                      <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </motion.div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">تم الإرسال بنجاح!</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">تم إرسال رابط إعادة تعيين كلمة المرور إلى</p>
                    <p className="text-sm font-semibold text-emerald-600 mb-6">{email}</p>
                    <Button variant="outline" className="w-full rounded-2xl h-11" onClick={() => { setResetMode(false); setResetSent(false); }}>
                      العودة لتسجيل الدخول
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleReset} className="space-y-4">
                    <div className="text-center mb-6">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-3">
                        <KeyRound className="w-6 h-6 text-amber-600" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">نسيت كلمة المرور؟</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين</p>
                    </div>
                    <div className="relative">
                      <Mail className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-gray-400" />
                      <Input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="البريد الإلكتروني"
                        className="h-12 pr-10 pl-4 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                        dir="ltr"
                      />
                    </div>
                    <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                      {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "إرسال رابط التعيين"}
                    </Button>
                    <Button type="button" variant="ghost" className="w-full text-sm text-gray-500" onClick={() => setResetMode(false)}>
                      العودة لتسجيل الدخول
                    </Button>
                  </form>
                )}
              </motion.div>
            ) : (
              /* ─── Login Mode ─── */
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="text-center mb-6">
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">تسجيل الدخول</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">أدخل بيانات حسابك للوصول إلى لوحة التحكم</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Email */}
                  <div className="relative">
                    <Mail className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-gray-400" />
                    <Input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="البريد الإلكتروني"
                      className="h-12 pr-10 pl-4 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm"
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
                      placeholder="كلمة المرور"
                      className="h-12 pr-10 pl-10 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm"
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
                      className="text-xs text-emerald-600 hover:underline font-medium"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  </div>

                  {/* Login Button */}
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg shadow-emerald-600/30 transition-all duration-200"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Shield className="w-4 h-4" />
                        تسجيل الدخول
                      </div>
                    )}
                  </Button>

                  {/* Biometric Login - Always show if available and has saved creds */}
                  {biometricAvailable && (
                    <button
                      type="button"
                      onClick={handleBiometricLogin}
                      disabled={biometricLoading || !hasSavedCreds}
                      className={`w-full h-12 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
                        hasSavedCreds
                          ? "border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                          : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {biometricLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Fingerprint className="w-5 h-5" />
                          {hasSavedCreds ? "تسجيل الدخول بالبصمة" : "سجل دخولك أولاً لتفعيل البصمة"}
                        </>
                      )}
                    </button>
                  )}
                </form>

                {/* Info Notice */}
                <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                      هذا التطبيق مخصص فقط للمسؤولين ومديري الشبكات. يتم التحقق من الصلاحيات عبر Firebase. لا يمكن إنشاء حساب جديد من هنا.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
