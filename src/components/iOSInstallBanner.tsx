"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, X, Plus, ArrowDown } from "lucide-react";

export function iOSInstallBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Only show on iOS Safari, and not when already installed as PWA
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    const wasDismissed = sessionStorage.getItem("ios-install-dismissed");

    if (isIOS && !isInStandalone && !wasDismissed) {
      // Show banner after 3 seconds
      const t = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem("ios-install-dismissed", "1");
    setDismissed(true);
    setShow(false);
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[200]"
            onClick={handleDismiss}
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-[201] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl"
            dir="rtl"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600" />
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 left-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>

            <div className="px-6 pb-10 pt-2">
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                {/* App icon */}
                <img
                  src="/apple-touch-icon.png"
                  alt="Apple.NET"
                  className="w-16 h-16 rounded-2xl shadow-md"
                />
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Apple.NET</h2>
                  <p className="text-sm text-gray-500 dark:text-slate-400">ثبّت التطبيق على شاشتك</p>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-4 mb-6">
                {/* Step 1 */}
                <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800 rounded-2xl p-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <Share2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">الخطوة 1</p>
                    <p className="text-gray-600 dark:text-slate-400 text-sm">
                      اضغط على <strong>زر المشاركة</strong>{" "}
                      <span className="inline-flex items-center gap-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 rounded text-xs">
                        <Share2 className="w-3 h-3" /> مشاركة
                      </span>{" "}
                      في أسفل Safari
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800 rounded-2xl p-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">الخطوة 2</p>
                    <p className="text-gray-600 dark:text-slate-400 text-sm">
                      اختر <strong>&ldquo;إضافة إلى الشاشة الرئيسية&rdquo;</strong> من القائمة
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800 rounded-2xl p-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1B7A3D] flex items-center justify-center flex-shrink-0">
                    <ArrowDown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">الخطوة 3</p>
                    <p className="text-gray-600 dark:text-slate-400 text-sm">
                      اضغط <strong>&ldquo;إضافة&rdquo;</strong> — التطبيق سيظهر فوراً على شاشتك الرئيسية!
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom arrow hint */}
              <div className="flex flex-col items-center gap-1 text-gray-400 dark:text-slate-500 text-xs">
                <ArrowDown className="w-5 h-5 animate-bounce" />
                <span>زر المشاركة في الأسفل</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
