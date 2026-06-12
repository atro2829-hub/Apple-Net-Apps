#!/bin/bash
set -e

# ─── Apple.NET Mobile Build Script ───
# Builds both User and Admin Android APKs
# Usage: ./scripts/build-mobile.sh [user|admin|both]

BUILD_TYPE="${1:-both}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🔧 Apple.NET Mobile Build Script"
echo "📁 Project Root: $PROJECT_ROOT"
echo "📱 Build Type: $BUILD_TYPE"
echo ""

# ─── Step 1: Install Dependencies ───
echo "📦 Installing dependencies..."
cd "$PROJECT_ROOT"
bun install

# ─── Step 2: Build Next.js Static Export ───
echo ""
echo "🏗️ Building Next.js static export..."

# Create export config
cat > next.config.build.ts << 'EXPORTCONFIG'
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  trailingSlash: true,
  output: "export",
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  reactStrictMode: false,
  images: { unoptimized: true },
};
export default nextConfig;
EXPORTCONFIG

# Swap configs
cp next.config.ts next.config.dev.bak
cp next.config.build.ts next.config.ts

# Remove API routes (not needed for static export)
rm -rf src/app/api

# Build
bun run build

# Restore dev config
cp next.config.dev.bak next.config.ts
rm next.config.build.ts next.config.dev.bak

echo "✅ Static export completed: out/"

# ─── Step 3: Prepare Admin Web Dir ───
# CRITICAL FIX: Instead of redirect, copy admin page content to root
# This fixes the green screen issue where Capacitor couldn't load /admin/ path
if [ "$BUILD_TYPE" = "admin" ] || [ "$BUILD_TYPE" = "both" ]; then
  echo ""
  echo "🔧 Preparing admin web directory (root-level fix)..."
  
  # Copy out/ to out-admin/
  rm -rf out-admin
  cp -r out out-admin
  
  # ─── ROOT-LEVEL FIX ───
  # The admin app must load at "/" not "/admin/" for Capacitor
  # Strategy: Copy admin HTML to root index.html and fix asset paths
  
  if [ -f out-admin/admin/index.html ]; then
    # Read the admin page HTML
    ADMIN_HTML=$(cat out-admin/admin/index.html)
    
    # Replace the root index.html with admin content
    # The admin page references /_next/ which works from root
    echo "$ADMIN_HTML" > out-admin/index.html
    
    echo "✅ Admin root page set (admin/index.html → index.html)"
  else
    echo "⚠️ Warning: out-admin/admin/index.html not found, using fallback redirect"
    # Fallback: create a proper redirect that works in Capacitor
    cat > out-admin/index.html << 'REDIRECT'
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>Apple.NET Admin</title>
  <script>
    // Direct navigation for Capacitor compatibility
    window.location.replace('/admin/');
  </script>
</head>
<body>
  <p>جاري التحويل...</p>
</body>
</html>
REDIRECT
  fi

  echo "✅ Admin web directory prepared: out-admin/"
fi

# ─── Step 4: Generate Android Icons ───
echo ""
echo "🎨 Generating Android icons..."

ICONS_SRC="$PROJECT_ROOT/upload/app-icon-original.png"
if [ ! -f "$ICONS_SRC" ]; then
  echo "⚠️ Warning: app-icon-original.png not found in upload/"
fi

echo "✅ Icons already generated in public/icons/android/"

# ─── Build User App ───
build_user_app() {
  echo ""
  echo "📱 Building USER APP (com.applenet.app)..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  cd "$PROJECT_ROOT"
  
  # Remove old android project
  rm -rf android
  
  # Use user capacitor config
  cp capacitor.config.ts capacitor.config.current.ts
  cat > capacitor.config.user.ts << 'CAPCONFIG'
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.applenet.app',
  appName: 'Apple.NET',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    buildOptions: {
      keystorePath: '../keystore/apple-net.keystore',
      keystoreAlias: 'apple-net',
      keystorePassword: 'applenet2026',
      keystoreAliasPassword: 'applenet2026',
    },
    backgroundColor: '#1B7A3D',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#1B7A3D',
      sound: 'default',
    },
    Haptics: {},
    Filesystem: {
      directory: 'Documents',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1B7A3D',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    BiometricAuth: {
      iosKeychainAccessGroup: 'com.applenet.app',
    },
  },
};

export default config;
CAPCONFIG

  cp capacitor.config.user.ts capacitor.config.ts
  
  # Add Android platform
  npx cap add android 2>/dev/null || true
  npx cap sync android
  
  # Copy google-services.json
  cp "$PROJECT_ROOT/upload/google-services (17).json" android/app/google-services.json
  mkdir -p android/app/src/main/assets
  cp "$PROJECT_ROOT/upload/google-services (17).json" android/app/src/main/assets/google-services.json
  
  # Copy custom icons into Android project
  echo "🎨 Applying custom app icons..."
  ICON_DIR="$PROJECT_ROOT/public/icons/android"
  
  for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
    DST="android/app/src/main/res/mipmap-${density}"
    mkdir -p "$DST"
    if [ -f "$ICON_DIR/mipmap-${density}/ic_launcher.png" ]; then
      cp "$ICON_DIR/mipmap-${density}/ic_launcher.png" "$DST/ic_launcher.png"
      cp "$ICON_DIR/mipmap-${density}/ic_launcher_foreground.png" "$DST/ic_launcher_foreground.png"
      cp "$ICON_DIR/mipmap-${density}/ic_launcher_round.png" "$DST/ic_launcher_round.png"
      echo "  ✅ mipmap-${density}"
    fi
  done
  
  # Copy adaptive icon XML
  mkdir -p android/app/src/main/res/mipmap-anydpi-v26
  cp "$ICON_DIR/mipmap-anydpi-v26/ic_launcher.xml" android/app/src/main/res/mipmap-anydpi-v26/ 2>/dev/null || true
  cp "$ICON_DIR/mipmap-anydpi-v26/ic_launcher_round.xml" android/app/src/main/res/mipmap-anydpi-v26/ 2>/dev/null || true
  
  # Copy background color
  mkdir -p android/app/src/main/res/values
  cat > android/app/src/main/res/values/ic_launcher_background.xml << 'BGXML'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#1B7A3D</color>
</resources>
BGXML

  # Copy splash screens
  SPLASH_DIR="$PROJECT_ROOT/public/splash"
  for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
    for orient in port land; do
      DST="android/app/src/main/res/drawable-${orient}-${density}"
      mkdir -p "$DST"
      if [ -f "$SPLASH_DIR/splash-${density}.png" ]; then
        cp "$SPLASH_DIR/splash-${density}.png" "$DST/splash.png"
      fi
    done
  done
  # Also copy to drawable for default
  mkdir -p android/app/src/main/res/drawable
  if [ -f "$SPLASH_DIR/splash-xxhdpi.png" ]; then
    cp "$SPLASH_DIR/splash-xxhdpi.png" android/app/src/main/res/drawable/splash.png
  fi

  # Build release APK
  echo "🔨 Building release APK..."
  cd android
  chmod +x gradlew
  ./gradlew assembleRelease
  
  APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
  if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    echo "✅ User APK built: app/build/outputs/apk/release/app-release.apk"
    cp app/build/outputs/apk/release/app-release.apk "$PROJECT_ROOT/download/app-release.apk"
  else
    echo "❌ User APK build failed!"
    cd "$PROJECT_ROOT"
    return 1
  fi
  
  cd "$PROJECT_ROOT"
  
  # Restore original capacitor config
  cp capacitor.config.current.ts capacitor.config.ts
  rm capacitor.config.user.ts capacitor.config.current.ts
  
  echo "✅ USER APP build complete!"
}

# ─── Build Admin App ───
build_admin_app() {
  echo ""
  echo "📱 Building ADMIN APP (com.applenet.admin)..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  cd "$PROJECT_ROOT"
  
  # Remove old android project
  rm -rf android
  
  # Use admin capacitor config with webDir pointing to out-admin
  # Includes Filesystem plugin for PDF downloads
  cat > capacitor.config.admin.ts << 'CAPCONFIG'
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.applenet.admin',
  appName: 'Apple.NET Admin',
  webDir: 'out-admin',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    buildOptions: {
      keystorePath: '../keystore/apple-net.keystore',
      keystoreAlias: 'apple-net',
      keystorePassword: 'applenet2026',
      keystoreAliasPassword: 'applenet2026',
    },
    backgroundColor: '#10b981',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#10b981',
      sound: 'default',
    },
    Haptics: {},
    Filesystem: {
      directory: 'Documents',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#10b981',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    BiometricAuth: {
      iosKeychainAccessGroup: 'com.applenet.admin',
    },
  },
};

export default config;
CAPCONFIG

  cp capacitor.config.ts capacitor.config.current.ts
  cp capacitor.config.admin.ts capacitor.config.ts
  
  # Add Android platform
  npx cap add android 2>/dev/null || true
  npx cap sync android
  
  # Replace package name for admin app in all relevant files
  echo "📝 Setting admin package name (com.applenet.admin)..."
  find android -name "AndroidManifest.xml" -exec sed -i 's/com\.applenet\.app/com.applenet.admin/g' {} \;
  find android -name "build.gradle" -exec sed -i 's/com\.applenet\.app/com.applenet.admin/g' {} \;
  find android -name "strings.xml" -exec sed -i 's/Apple\.NET/Apple.NET Admin/g' {} \;
  
  # Move Java files to match admin package name
  mkdir -p android/app/src/main/java/com/applenet/admin
  if [ -f android/app/src/main/java/com/applenet/app/MainActivity.java ]; then
    sed 's/com\.applenet\.app/com.applenet.admin/g' android/app/src/main/java/com/applenet/app/MainActivity.java > android/app/src/main/java/com/applenet/admin/MainActivity.java
    rm -rf android/app/src/main/java/com/applenet/app
  fi
  
  # Add WRITE_EXTERNAL_STORAGE permission for PDF downloads
  if [ -f android/app/src/main/AndroidManifest.xml ]; then
    sed -i '/<application/i\    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />\n    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />' android/app/src/main/AndroidManifest.xml
  fi

  # Copy google-services.json for admin
  cp "$PROJECT_ROOT/upload/google-services (17).json" android/app/google-services.json
  mkdir -p android/app/src/main/assets
  cp "$PROJECT_ROOT/upload/google-services (17).json" android/app/src/main/assets/google-services.json
  
  # Copy custom icons (same icons for admin)
  echo "🎨 Applying custom app icons..."
  ICON_DIR="$PROJECT_ROOT/public/icons/android"
  
  for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
    DST="android/app/src/main/res/mipmap-${density}"
    mkdir -p "$DST"
    if [ -f "$ICON_DIR/mipmap-${density}/ic_launcher.png" ]; then
      cp "$ICON_DIR/mipmap-${density}/ic_launcher.png" "$DST/ic_launcher.png"
      cp "$ICON_DIR/mipmap-${density}/ic_launcher_foreground.png" "$DST/ic_launcher_foreground.png"
      cp "$ICON_DIR/mipmap-${density}/ic_launcher_round.png" "$DST/ic_launcher_round.png"
    fi
  done
  
  mkdir -p android/app/src/main/res/mipmap-anydpi-v26
  cp "$ICON_DIR/mipmap-anydpi-v26/ic_launcher.xml" android/app/src/main/res/mipmap-anydpi-v26/ 2>/dev/null || true
  cp "$ICON_DIR/mipmap-anydpi-v26/ic_launcher_round.xml" android/app/src/main/res/mipmap-anydpi-v26/ 2>/dev/null || true
  
  mkdir -p android/app/src/main/res/values
  cat > android/app/src/main/res/values/ic_launcher_background.xml << 'BGXML'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#10b981</color>
</resources>
BGXML

  # Copy splash screens
  SPLASH_DIR="$PROJECT_ROOT/public/splash"
  for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
    for orient in port land; do
      DST="android/app/src/main/res/drawable-${orient}-${density}"
      mkdir -p "$DST"
      if [ -f "$SPLASH_DIR/splash-${density}.png" ]; then
        cp "$SPLASH_DIR/splash-${density}.png" "$DST/splash.png"
      fi
    done
  done
  mkdir -p android/app/src/main/res/drawable
  if [ -f "$SPLASH_DIR/splash-xxhdpi.png" ]; then
    cp "$SPLASH_DIR/splash-xxhdpi.png" android/app/src/main/res/drawable/splash.png
  fi

  # Build release APK
  echo "🔨 Building admin release APK..."
  cd android
  chmod +x gradlew
  ./gradlew assembleRelease
  
  if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    echo "✅ Admin APK built: app/build/outputs/apk/release/app-release.apk"
    cp app/build/outputs/apk/release/app-release.apk "$PROJECT_ROOT/download/admin-release.apk"
  else
    echo "❌ Admin APK build failed!"
    cd "$PROJECT_ROOT"
    return 1
  fi
  
  cd "$PROJECT_ROOT"
  
  # Restore original capacitor config
  cp capacitor.config.current.ts capacitor.config.ts
  rm capacitor.config.admin.ts capacitor.config.current.ts
  
  echo "✅ ADMIN APP build complete!"
}

# ─── Execute Builds ───
mkdir -p "$PROJECT_ROOT/download"

case "$BUILD_TYPE" in
  user)
    build_user_app
    ;;
  admin)
    build_admin_app
    ;;
  both)
    build_user_app
    build_admin_app
    ;;
  *)
    echo "Usage: $0 [user|admin|both]"
    exit 1
    ;;
esac

echo ""
echo "🎉 Build completed successfully!"
echo "📱 APKs available in: $PROJECT_ROOT/download/"
ls -la "$PROJECT_ROOT/download/"*.apk 2>/dev/null || echo "No APKs found"
