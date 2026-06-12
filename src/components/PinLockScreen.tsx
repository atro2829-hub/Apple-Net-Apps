"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Fingerprint, Delete } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { ref, get } from "firebase/database";
import type { User } from "firebase/auth";

interface PinLockScreenProps {
  user: User | null;
  onUnlock: () => void;
  biometricEnabled?: boolean;
}

export function PinLockScreen({ user, onUnlock, biometricEnabled }: PinLockScreenProps) {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [storedPin, setStoredPin] = useState("");
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!user) return;
    get(ref(db, `users/${user.uid}/pinCode`)).then((snap) => {
      if (snap.val()) setStoredPin(atob(snap.val()));
    });
  }, [user]);

  const verifyPin = (enteredPin: string) => {
    if (enteredPin.length >= 4 && storedPin && enteredPin.length === storedPin.length) {
      if (enteredPin === storedPin) {
        onUnlock();
      } else {
        setError(true);
        setShake(true);
        setAttempts(prev => prev + 1);
        setTimeout(() => {
          setPin("");
          setShake(false);
        }, 600);
        
        if (attempts >= 2) {
          toast.error(isAr ? "رمز PIN خاطئ. حاول مرة أخرى" : "Wrong PIN. Try again");
        }
      }
    }
  };

  const handleKeyPress = (digit: string) => {
    if (pin.length >= 6) return;
    setError(false);
    const newPin = pin + digit;
    setPin(newPin);
    verifyPin(newPin);
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const handleBiometric = async () => {
    try {
      if (window.PublicKeyCredential) {
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);
        
        const credential = await navigator.credentials.get({
          publicKey: {
            challenge,
            userVerification: "required",
            timeout: 60000,
          },
        });
        
        if (credential) onUnlock();
      }
    } catch {
      toast.error(isAr ? "فشل التحقق بالبصمة" : "Biometric verification failed");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-6"
    >
      {/* Lock Icon */}
      <motion.div
        animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#1B7A3D] to-[#22A24D] flex items-center justify-center mb-6 shadow-lg">
          <Lock className="w-10 h-10 text-white" />
        </div>
      </motion.div>

      <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1">
        {isAr ? "أدخل رمز PIN" : "Enter PIN"}
      </h2>
      <p className="text-sm text-gray-400 dark:text-slate-500 mb-8">
        {isAr ? "أدخل الرمز للدخول إلى التطبيق" : "Enter code to access the app"}
      </p>

      {/* PIN Dots */}
      <div className="flex gap-4 mb-8">
        {[0,1,2,3,4,5].map(i => (
          <motion.div
            key={i}
            animate={{
              scale: i < pin.length ? 1.2 : 1,
              backgroundColor: error ? "#EF4444" : i < pin.length ? "#1B7A3D" : "#E5E7EB",
            }}
            className="w-4 h-4 rounded-full dark:bg-slate-600"
            style={i >= pin.length ? {} : {}}
          />
        ))}
      </div>

      {/* Number Pad */}
      <div className="grid grid-cols-3 gap-3 max-w-[280px]">
        {["1","2","3","4","5","6","7","8","9"].map(digit => (
          <motion.button
            key={digit}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleKeyPress(digit)}
            className="w-20 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 text-xl font-bold text-gray-900 dark:text-white flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          >
            {digit}
          </motion.button>
        ))}
        
        {/* Biometric button */}
        {biometricEnabled ? (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleBiometric}
            className="w-20 h-16 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center"
          >
            <Fingerprint className="w-6 h-6 text-purple-500" />
          </motion.button>
        ) : (
          <div className="w-20 h-16" />
        )}
        
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => handleKeyPress("0")}
          className="w-20 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 text-xl font-bold text-gray-900 dark:text-white flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
        >
          0
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleDelete}
          className="w-20 h-16 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Delete className="w-6 h-6" />
        </motion.button>
      </div>
    </motion.div>
  );
}
