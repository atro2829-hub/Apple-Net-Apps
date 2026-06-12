# Apple.NET ProGuard Rules
# Optimized for Capacitor + Firebase Android apps

# ─── Keep Capacitor Plugins ───────────────────────────────
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-keep class com.applenet.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }

# ─── Keep Firebase ────────────────────────────────────────
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**

# ─── Keep Biometric Auth Plugin ───────────────────────────
-keep class com.aparajita.capacitor.biometricauth.** { *; }

# ─── AndroidX ─────────────────────────────────────────────
-keep class androidx.** { *; }
-keep interface androidx.** { *; }

# ─── WebView ──────────────────────────────────────────────
-keep class android.webkit.** { *; }
-keep class android.webkit.WebView { *; }

# ─── OkHttp (used by Firebase) ───────────────────────────
-dontwarn okhttp3.**
-dontwarn okio.**

# ─── Gson (used by various libraries) ────────────────────
-keepattributes Signature
-keepattributes *Annotation*

# ─── General optimizations ────────────────────────────────
-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-verbose

# ─── Remove logging in release ────────────────────────────
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
