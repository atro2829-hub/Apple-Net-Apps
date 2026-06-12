#!/bin/bash
set -e

# ─── Apple.NET Mobile Build Script ───
# Builds both User and Admin Android APKs
# Usage: ./scripts/build-mobile.sh [user|admin|both]

BUILD_TYPE="${1:-both}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION_CODE=2
VERSION_NAME="1.0.0"

echo "🔧 Apple.NET Mobile Build Script"
echo "📁 Project Root: $PROJECT_ROOT"
echo "📱 Build Type: $BUILD_TYPE"
echo ""

# ─── Step 1: Install Dependencies ───
echo "📦 Installing dependencies..."
cd "$PROJECT_ROOT"
bun install

# ─── Build User App ───
build_user_app() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📱 Building USER APP (com.applenet.app)..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  cd "$PROJECT_ROOT"

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
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "framer-motion",
    ],
  },
};
export default nextConfig;
EXPORTCONFIG

  # Swap configs
  cp next.config.ts next.config.dev.bak
  cp next.config.build.ts next.config.ts

  # Remove API routes (not needed for static export)
  rm -rf src/app/api

  # Remove admin pages from user build (reduces bundle)
  rm -rf src/app/admin
  rm -rf src/components/admin

  # Build
  bun run build

  # Restore dev config
  cp next.config.dev.bak next.config.ts
  rm next.config.build.ts next.config.dev.bak

  echo "✅ User static export completed"

  # ─── Build Android APK ───
  rm -rf android

  cat > capacitor.config.ts << 'CAPCONFIG'
import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.applenet.app',
  appName: 'Apple.NET',
  webDir: 'out',
  server: { androidScheme: 'https', cleartext: false },
  android: {
    buildOptions: {
      keystorePath: '../keystore/apple-net-2026.keystore',
      keystoreAlias: 'applenet',
      keystorePassword: 'applenet2026',
      keystoreAliasPassword: 'applenet2026',
    },
    backgroundColor: '#1B7A3D',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
    LocalNotifications: { smallIcon: 'ic_stat_icon_config_sample', iconColor: '#1B7A3D', sound: 'default' },
    Haptics: {},
    Filesystem: { directory: 'Documents' },
    SplashScreen: {
      launchShowDuration: 2000, launchAutoHide: true, backgroundColor: '#1B7A3D',
      androidSplashResourceName: 'splash', androidScaleType: 'CENTER_CROP',
      showSpinner: false, splashFullScreen: true, splashImmersive: true,
    },
    BiometricAuth: { iosKeychainAccessGroup: 'com.applenet.app' },
  },
};
export default config;
CAPCONFIG

  npx cap add android 2>/dev/null || true
  npx cap sync android

  # Copy google-services.json
  if [ -f "$PROJECT_ROOT/upload/google-services.json" ]; then
    cp "$PROJECT_ROOT/upload/google-services.json" android/app/google-services.json
    mkdir -p android/app/src/main/assets
    cp "$PROJECT_ROOT/upload/google-services.json" android/app/src/main/assets/google-services.json
  fi

  # Copy icons
  ICON_DIR="$PROJECT_ROOT/public/icons/android"
  for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
    DST="android/app/src/main/res/mipmap-${density}"
    mkdir -p "$DST"
    if [ -f "$ICON_DIR/mipmap-${density}/ic_launcher.png" ]; then
      cp "$ICON_DIR/mipmap-${density}/ic_launcher.png" "$DST/"
      cp "$ICON_DIR/mipmap-${density}/ic_launcher_foreground.png" "$DST/"
      cp "$ICON_DIR/mipmap-${density}/ic_launcher_round.png" "$DST/"
    fi
  done

  mkdir -p android/app/src/main/res/mipmap-anydpi-v26
  cp "$ICON_DIR/mipmap-anydpi-v26/"*.xml android/app/src/main/res/mipmap-anydpi-v26/ 2>/dev/null || true

  mkdir -p android/app/src/main/res/values
  echo '<?xml version="1.0" encoding="utf-8"?><resources><color name="ic_launcher_background">#1B7A3D</color></resources>' > android/app/src/main/res/values/ic_launcher_background.xml

  # Copy splash
  SPLASH_DIR="$PROJECT_ROOT/public/splash"
  for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
    for orient in port land; do
      DST="android/app/src/main/res/drawable-${orient}-${density}"
      mkdir -p "$DST"
      [ -f "$SPLASH_DIR/splash-${density}.png" ] && cp "$SPLASH_DIR/splash-${density}.png" "$DST/splash.png"
    done
  done
  mkdir -p android/app/src/main/res/drawable
  [ -f "$SPLASH_DIR/splash-xxhdpi.png" ] && cp "$SPLASH_DIR/splash-xxhdpi.png" android/app/src/main/res/drawable/splash.png

  # Apply ProGuard and minification
  cp "$PROJECT_ROOT/scripts/proguard-rules.pro" android/app/proguard-rules.pro 2>/dev/null || true
  sed -i 's/minifyEnabled false/minifyEnabled true/g' android/app/build.gradle
  sed -i 's/shrinkResources false/shrinkResources true/g' android/app/build.gradle
  sed -i "s/versionCode 1/versionCode $VERSION_CODE/g" android/app/build.gradle
  sed -i "s/versionName \"1.0\"/versionName \"$VERSION_NAME\"/g" android/app/build.gradle
  sed -i "s|apple-net.keystore|apple-net-2026.keystore|g" android/app/build.gradle
  sed -i "s|keyAlias 'apple-net'|keyAlias 'applenet'|g" android/app/build.gradle

  # Build
  cd android
  chmod +x gradlew
  ./gradlew assembleRelease

  if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    APK_SIZE=$(du -h app/build/outputs/apk/release/app-release.apk | cut -f1)
    echo "📱 User APK size: $APK_SIZE"
    cp app/build/outputs/apk/release/app-release.apk "$PROJECT_ROOT/download/app-release.apk"
    echo "✅ User APK built!"
  else
    echo "❌ User APK build failed!"
    cd "$PROJECT_ROOT"
    return 1
  fi

  cd "$PROJECT_ROOT"
}

# ─── Build Admin App ───
build_admin_app() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📱 Building ADMIN APP (com.applenet.admin)..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  cd "$PROJECT_ROOT"

  # Restore admin pages (may have been deleted by user build)
  git checkout -- src/app/admin src/components/admin 2>/dev/null || true

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
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "framer-motion",
    ],
  },
};
export default nextConfig;
EXPORTCONFIG

  # Swap configs
  cp next.config.ts next.config.dev.bak
  cp next.config.build.ts next.config.ts

  # Remove API routes
  rm -rf src/app/api

  # ─── ADMIN ROOT FIX ───
  # Move admin page to root so Capacitor loads it at /
  mv src/app/page.tsx src/app/page.user.bak.tsx
  mv src/app/admin/page.tsx src/app/page.tsx
  mv src/app/admin/layout.tsx src/app/layout.admin.bak.tsx

  # Build
  bun run build

  # Copy output to out-admin
  rm -rf out-admin
  cp -r out out-admin

  # Restore original files
  cp next.config.dev.bak next.config.ts
  rm next.config.build.ts next.config.dev.bak
  mv src/app/page.user.bak.tsx src/app/page.tsx
  mv src/app/layout.admin.bak.tsx src/app/admin/layout.tsx
  git checkout -- src/app/admin/page.tsx 2>/dev/null || true

  echo "✅ Admin static export completed"

  # ─── Build Android APK ───
  rm -rf android

  cat > capacitor.config.ts << 'CAPCONFIG'
import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.applenet.admin',
  appName: 'Apple.NET Admin',
  webDir: 'out-admin',
  server: { androidScheme: 'https', cleartext: false },
  android: {
    buildOptions: {
      keystorePath: '../keystore/apple-net-2026.keystore',
      keystoreAlias: 'applenet',
      keystorePassword: 'applenet2026',
      keystoreAliasPassword: 'applenet2026',
    },
    backgroundColor: '#10b981',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
    LocalNotifications: { smallIcon: 'ic_stat_icon_config_sample', iconColor: '#10b981', sound: 'default' },
    Haptics: {},
    Filesystem: { directory: 'Documents' },
    SplashScreen: {
      launchShowDuration: 2000, launchAutoHide: true, backgroundColor: '#10b981',
      androidSplashResourceName: 'splash', androidScaleType: 'CENTER_CROP',
      showSpinner: false, splashFullScreen: true, splashImmersive: true,
    },
    BiometricAuth: { iosKeychainAccessGroup: 'com.applenet.admin' },
  },
};
export default config;
CAPCONFIG

  npx cap add android 2>/dev/null || true
  npx cap sync android

  # Set admin package name
  find android -name "AndroidManifest.xml" -exec sed -i 's/com\.applenet\.app/com.applenet.admin/g' {} \;
  find android -name "build.gradle" -exec sed -i 's/com\.applenet\.app/com.applenet.admin/g' {} \;
  find android -name "strings.xml" -exec sed -i 's/Apple\.NET/Apple.NET Admin/g' {} \;

  # Move Java files
  mkdir -p android/app/src/main/java/com/applenet/admin
  if [ -f android/app/src/main/java/com/applenet/app/MainActivity.java ]; then
    sed 's/com\.applenet\.app/com.applenet.admin/g' android/app/src/main/java/com/applenet/app/MainActivity.java > android/app/src/main/java/com/applenet/admin/MainActivity.java
    rm -rf android/app/src/main/java/com/applenet/app
  fi

  # Add storage permissions for PDF downloads
  sed -i '/<application/i\    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />\n    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />' android/app/src/main/AndroidManifest.xml

  # Copy google-services.json
  if [ -f "$PROJECT_ROOT/upload/google-services.json" ]; then
    cp "$PROJECT_ROOT/upload/google-services.json" android/app/google-services.json
    mkdir -p android/app/src/main/assets
    cp "$PROJECT_ROOT/upload/google-services.json" android/app/src/main/assets/google-services.json
  fi

  # Copy icons
  ICON_DIR="$PROJECT_ROOT/public/icons/android"
  for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
    DST="android/app/src/main/res/mipmap-${density}"
    mkdir -p "$DST"
    if [ -f "$ICON_DIR/mipmap-${density}/ic_launcher.png" ]; then
      cp "$ICON_DIR/mipmap-${density}/ic_launcher.png" "$DST/"
      cp "$ICON_DIR/mipmap-${density}/ic_launcher_foreground.png" "$DST/"
      cp "$ICON_DIR/mipmap-${density}/ic_launcher_round.png" "$DST/"
    fi
  done

  mkdir -p android/app/src/main/res/mipmap-anydpi-v26
  cp "$ICON_DIR/mipmap-anydpi-v26/"*.xml android/app/src/main/res/mipmap-anydpi-v26/ 2>/dev/null || true

  mkdir -p android/app/src/main/res/values
  echo '<?xml version="1.0" encoding="utf-8"?><resources><color name="ic_launcher_background">#10b981</color></resources>' > android/app/src/main/res/values/ic_launcher_background.xml

  # Copy splash
  SPLASH_DIR="$PROJECT_ROOT/public/splash"
  for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
    for orient in port land; do
      DST="android/app/src/main/res/drawable-${orient}-${density}"
      mkdir -p "$DST"
      [ -f "$SPLASH_DIR/splash-${density}.png" ] && cp "$SPLASH_DIR/splash-${density}.png" "$DST/splash.png"
    done
  done
  mkdir -p android/app/src/main/res/drawable
  [ -f "$SPLASH_DIR/splash-xxhdpi.png" ] && cp "$SPLASH_DIR/splash-xxhdpi.png" android/app/src/main/res/drawable/splash.png

  # Apply ProGuard and minification
  cp "$PROJECT_ROOT/scripts/proguard-rules.pro" android/app/proguard-rules.pro 2>/dev/null || true
  sed -i 's/minifyEnabled false/minifyEnabled true/g' android/app/build.gradle
  sed -i 's/shrinkResources false/shrinkResources true/g' android/app/build.gradle
  sed -i "s/versionCode 1/versionCode $VERSION_CODE/g" android/app/build.gradle
  sed -i "s/versionName \"1.0\"/versionName \"$VERSION_NAME\"/g" android/app/build.gradle
  sed -i "s|apple-net.keystore|apple-net-2026.keystore|g" android/app/build.gradle
  sed -i "s|keyAlias 'apple-net'|keyAlias 'applenet'|g" android/app/build.gradle

  # Build
  cd android
  chmod +x gradlew
  ./gradlew assembleRelease

  if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    APK_SIZE=$(du -h app/build/outputs/apk/release/app-release.apk | cut -f1)
    echo "📱 Admin APK size: $APK_SIZE"
    cp app/build/outputs/apk/release/app-release.apk "$PROJECT_ROOT/download/admin-release.apk"
    echo "✅ Admin APK built!"
  else
    echo "❌ Admin APK build failed!"
    cd "$PROJECT_ROOT"
    return 1
  fi

  cd "$PROJECT_ROOT"
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
