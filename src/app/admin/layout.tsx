"use client";

import React from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";
import { ThemeProvider } from "@/context/ThemeProvider";
import { LanguageProvider } from "@/context/LanguageContext";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <div
          className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 antialiased transition-colors duration-200`}
          dir="rtl"
          lang="ar"
        >
          {children}
        </div>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              borderRadius: "16px",
              fontSize: "13px",
            },
          }}
        />
      </LanguageProvider>
    </ThemeProvider>
  );
}
