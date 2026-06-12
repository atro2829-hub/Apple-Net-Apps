"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import { ref, set, get, push, update, remove, onValue } from "firebase/database";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardList, Pencil, Save, X, FileText, BookOpen,
  Shield, HelpCircle, MessageSquare
} from "lucide-react";

interface ContentSection {
  id: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
}

const SECTION_CONFIGS = [
  { id: "terms", label: "الشروط والأحكام", icon: Shield },
  { id: "privacy", label: "سياسة الخصوصية", icon: Shield },
  { id: "about", label: "عن التطبيق", icon: BookOpen },
  { id: "help", label: "المساعدة", icon: HelpCircle },
  { id: "faq", label: "الأسئلة الشائعة", icon: MessageSquare },
];

export function ContentSection() {
  const [activeSection, setActiveSection] = useState("terms");
  const [contents, setContents] = useState<Record<string, ContentSection>>({});
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ titleAr: "", titleEn: "", bodyAr: "", bodyEn: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(db, "appContent"), (snap) => {
      const data = snap.val() || {};
      setContents(data);
    });
    return () => unsub();
  }, []);

  const [prevSection, setPrevSection] = useState(activeSection);
  if (activeSection !== prevSection) {
    setPrevSection(activeSection);
    const section = contents[activeSection];
    if (section) {
      setForm({
        titleAr: section.titleAr || "",
        titleEn: section.titleEn || "",
        bodyAr: section.bodyAr || "",
        bodyEn: section.bodyEn || "",
      });
    } else {
      setForm({ titleAr: "", titleEn: "", bodyAr: "", bodyEn: "" });
    }
    setEditing(false);
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await update(ref(db, `appContent/${activeSection}`), form);
      toast.success("تم حفظ المحتوى بنجاح");
      setEditing(false);
    } catch { toast.error("حدث خطأ أثناء الحفظ"); }
    setSaving(false);
  };

  const currentConfig = SECTION_CONFIGS.find(s => s.id === activeSection);
  const currentContent = contents[activeSection];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">المحتوى</h2>
            <p className="text-sm text-gray-500">إدارة محتوى التطبيق وصفحاته</p>
          </div>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Save className="w-4 h-4 ml-1" /> {saving ? "جاري الحفظ..." : "حفظ"}
            </Button>
            <Button variant="outline" onClick={() => setEditing(false)}>
              <X className="w-4 h-4 ml-1" /> إلغاء
            </Button>
          </div>
        ) : (
          <Button onClick={() => setEditing(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Pencil className="w-4 h-4 ml-1" /> تعديل
          </Button>
        )}
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl overflow-x-auto">
        {SECTION_CONFIGS.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          const hasContent = !!contents[section.id];
          return (
            <button key={section.id} onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                isActive ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-gray-500 dark:text-slate-400"
              }`}
            >
              <Icon className="w-4 h-4" />
              {section.label}
              {hasContent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div key={activeSection} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
          {editing ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    🇾🇪 المحتوى العربي
                  </h4>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">العنوان (عربي)</label>
                    <Input value={form.titleAr} onChange={e => setForm(f => ({ ...f, titleAr: e.target.value }))} placeholder="العنوان بالعربي" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">المحتوى (عربي)</label>
                    <Textarea value={form.bodyAr} onChange={e => setForm(f => ({ ...f, bodyAr: e.target.value }))} placeholder="المحتوى باللغة العربية..." rows={12} className="min-h-[300px]" />
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    🇬🇧 English Content
                  </h4>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">Title (English)</label>
                    <Input value={form.titleEn} onChange={e => setForm(f => ({ ...f, titleEn: e.target.value }))} placeholder="Title in English" dir="ltr" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">Content (English)</label>
                    <Textarea value={form.bodyEn} onChange={e => setForm(f => ({ ...f, bodyEn: e.target.value }))} placeholder="Content in English..." rows={12} dir="ltr" className="min-h-[300px]" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
              {currentContent ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {currentContent.titleAr || "بدون عنوان"}
                    </h3>
                    {currentContent.titleEn && (
                      <p className="text-sm text-gray-400 mb-4">{currentContent.titleEn}</p>
                    )}
                  </div>
                  {currentContent.bodyAr && (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {currentContent.bodyAr}
                      </div>
                    </div>
                  )}
                  {currentContent.bodyEn && (
                    <div className="border-t border-gray-100 dark:border-slate-700 pt-4 mt-4">
                      <p className="text-xs text-gray-400 mb-2">English Version:</p>
                      <div className="text-gray-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed text-sm" dir="ltr">
                        {currentContent.bodyEn}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>لا يوجد محتوى لهذا القسم بعد</p>
                  <p className="text-sm mt-1">اضغط على "تعديل" لإضافة المحتوى</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
