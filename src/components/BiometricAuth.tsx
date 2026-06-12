"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, AlertTriangle, ToggleLeft, ToggleRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { ref, onValue, update } from "firebase/database";
import type { User } from "firebase/auth";

interface BiometricAuthProps {
  user: User | null;
}

export function BiometricAuth({ user }: BiometricAuthProps) {
  const { t, isRTL, lang } = useLanguage();
  const isAr = lang === "ar";
  
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasBiometricCapability, setHasBiometricCapability] = useState(false);

  // Load settings from Firebase
  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(db, `users/${user.uid}`), (snap) => {
      const data = snap.val();
      if (data) {
        setBiometricEnabled(!!data.biometricEnabled);
        setPinEnabled(!!data.pinEnabled);
      }
    });
    return () => unsub();
  }, [user]);

  // Check biometric capability
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check if running in Capacitor native app
      if ("Capacitor" in window) {
        setHasBiometricCapability(true);
        return;
      }
      // Check if WebAuthn is available
      if (window.PublicKeyCredential) {
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then((available) => {
          setHasBiometricCapability(available);
        }).catch(() => setHasBiometricCapability(false));
      }
    }
  }, []);

  const toggleBiometric = async () => {
    if (!user) return;
    
    if (!biometricEnabled) {
      try {
        // Try Capacitor native biometric first
        if (typeof window !== "undefined" && "Capacitor" in window) {
          try {
            const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
            const { status } = await BiometricAuth.authenticate({
              reason: isAr ? "تفعيل الدخول بالبصمة" : "Enable fingerprint login",
              cancelTitle: isAr ? "إلغاء" : "Cancel",
              fallbackTitle: isAr ? "استخدام كلمة المرور" : "Use password",
            });
            if (status === "success") {
              await update(ref(db, `users/${user.uid}`), { biometricEnabled: true });
              setBiometricEnabled(true);
              toast.success(isAr ? "تم تفعيل البصمة بنجاح" : "Biometric enabled successfully");
              return;
            }
          } catch {
            // Plugin not available, fall through to WebAuthn
          }
        }
        
        // WebAuthn fallback
        if (hasBiometricCapability && window.PublicKeyCredential) {
          const challenge = new Uint8Array(32);
          crypto.getRandomValues(challenge);
          const credential = await navigator.credentials.create({
            publicKey: {
              challenge,
              rp: { name: "Apple.NET" },
              user: {
                id: new TextEncoder().encode(user.uid),
                name: user.email || "user",
                displayName: user.displayName || "User",
              },
              pubKeyCredParams: [{ type: "public-key", alg: -7 }],
              authenticatorSelection: {
                authenticatorAttachment: "platform",
                userVerification: "required",
              },
              timeout: 60000,
            },
          });
          if (credential) {
            await update(ref(db, `users/${user.uid}`), { biometricEnabled: true });
            setBiometricEnabled(true);
            toast.success(isAr ? "تم تفعيل البصمة بنجاح" : "Biometric enabled successfully");
          }
        } else {
          toast.error(isAr ? "جهازك لا يدعم البصمة" : "Your device doesn't support biometrics");
        }
      } catch {
        toast.error(isAr ? "فشل في تفعيل البصمة" : "Failed to enable biometrics");
      }
    } else {
      await update(ref(db, `users/${user.uid}`), { biometricEnabled: false });
      setBiometricEnabled(false);
      toast.success(isAr ? "تم إلغاء تفعيل البصمة" : "Biometric disabled");
    }
  };

  const handlePinSetup = async () => {
    if (!user) return;
    
    if (step === "enter") {
      if (pin.length < 4) {
        toast.error(isAr ? "يجب أن يكون الرمز 4 أرقام على الأقل" : "PIN must be at least 4 digits");
        return;
      }
      setStep("confirm");
      setConfirmPin("");
      return;
    }
    
    if (step === "confirm") {
      if (pin !== confirmPin) {
        toast.error(isAr ? "الرمز غير متطابق" : "PIN doesn't match");
        setConfirmPin("");
        setStep("enter");
        setPin("");
        return;
      }
      
      setIsVerifying(true);
      try {
        await update(ref(db, `users/${user.uid}`), {
          pinEnabled: true,
          pinCode: btoa(pin), // Simple encoding (not encryption - for app lock only)
        });
        setPinEnabled(true);
        setShowPinSetup(false);
        setPin("");
        setConfirmPin("");
        setStep("enter");
        toast.success(isAr ? "تم تفعيل رمز PIN بنجاح" : "PIN enabled successfully");
      } catch {
        toast.error(isAr ? "فشل في تفعيل رمز PIN" : "Failed to enable PIN");
      }
      setIsVerifying(false);
    }
  };

  const disablePin = async () => {
    if (!user) return;
    await update(ref(db, `users/${user.uid}`), {
      pinEnabled: false,
      pinCode: null,
    });
    setPinEnabled(false);
    toast.success(isAr ? "تم إلغاء رمز PIN" : "PIN disabled");
  };

  return (
    <div className="space-y-3" dir={isRTL ? "rtl" : "ltr"}>
      {/* Biometric Toggle */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl card-shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
              <Fingerprint className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{isAr ? "الدخول بالبصمة" : "Fingerprint Login"}</p>
              <p className="text-[11px] text-gray-400 dark:text-slate-500">{isAr ? "استخدم بصمة إصبعك للدخول" : "Use your fingerprint to sign in"}</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleBiometric}
            disabled={!hasBiometricCapability}
          >
            {biometricEnabled ? (
              <ToggleRight className="w-10 h-6 text-[#1B7A3D]" />
            ) : (
              <ToggleLeft className="w-10 h-6 text-gray-300 dark:text-slate-600" />
            )}
          </motion.button>
        </div>
        {!hasBiometricCapability && (
          <p className="text-[10px] text-amber-500 mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {isAr ? "جهازك لا يدعم البصمة" : "Device doesn't support biometrics"}
          </p>
        )}
      </div>

      {/* PIN Toggle */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl card-shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{isAr ? "رمز PIN" : "PIN Code"}</p>
              <p className="text-[11px] text-gray-400 dark:text-slate-500">{isAr ? "قم بتفعيل رمز PIN لحماية التطبيق" : "Enable PIN to protect the app"}</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => pinEnabled ? disablePin() : setShowPinSetup(true)}
          >
            {pinEnabled ? (
              <ToggleRight className="w-10 h-6 text-[#1B7A3D]" />
            ) : (
              <ToggleLeft className="w-10 h-6 text-gray-300 dark:text-slate-600" />
            )}
          </motion.button>
        </div>
      </div>

      {/* PIN Setup Modal */}
      <AnimatePresence>
        {showPinSetup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 30 }}
              className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="bg-gradient-to-l from-[#1B7A3D] to-[#22A24D] p-5 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-black text-white">
                  {step === "enter" 
                    ? (isAr ? "إنشاء رمز PIN" : "Create PIN Code")
                    : (isAr ? "تأكيد رمز PIN" : "Confirm PIN Code")}
                </h2>
                <p className="text-white/70 text-xs mt-1">
                  {step === "enter"
                    ? (isAr ? "أدخل رمز PIN المكون من 4-6 أرقام" : "Enter a 4-6 digit PIN")
                    : (isAr ? "أعد إدخال الرمز للتأكيد" : "Re-enter the PIN to confirm")}
                </p>
              </div>
              
              <div className="p-5 space-y-4">
                <div className="flex justify-center">
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={step === "enter" ? pin : confirmPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (step === "enter") setPin(val);
                      else setConfirmPin(val);
                    }}
                    placeholder={step === "enter" ? "••••" : "••••"}
                    dir="ltr"
                    className="w-40 h-14 text-center text-2xl font-mono tracking-[0.5em] rounded-xl border-2 focus:border-[#1B7A3D]"
                    autoFocus
                  />
                </div>

                {/* PIN Dots Indicator */}
                <div className="flex justify-center gap-2">
                  {[0,1,2,3,4,5].map(i => {
                    const currentVal = step === "enter" ? pin : confirmPin;
                    return (
                      <div
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          i < currentVal.length ? "bg-[#1B7A3D] scale-110" : "bg-gray-200 dark:bg-slate-600"
                        }`}
                      />
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowPinSetup(false);
                      setPin("");
                      setConfirmPin("");
                      setStep("enter");
                    }}
                    className="flex-1 rounded-xl h-11"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </Button>
                  <Button
                    onClick={handlePinSetup}
                    disabled={isVerifying || (step === "enter" ? pin.length < 4 : confirmPin.length < 4)}
                    className="flex-1 bg-gradient-to-l from-[#1B7A3D] to-[#22A24D] text-white rounded-xl h-11 font-bold disabled:opacity-40"
                  >
                    {isVerifying ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : step === "enter" ? (
                      isAr ? "التالي" : "Next"
                    ) : (
                      isAr ? "تأكيد" : "Confirm"
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
