---
Task ID: 1
Agent: Main Agent
Task: Major Apple.NET update - Admin separation, biometric auth, push notifications, telecom recharge, responsive design, Capacitor setup, CI/CD

Work Log:
- Updated Firebase config from apple-net-df0e7 to applenet711 project
- Created /admin route with separate layout and auth gate
- Created API routes: /api/notify, /api/notify/broadcast, /api/notify/transaction, /api/telecom/purchase, /api/upload, /api/keystore
- Rewrote TelecomRechargePage with custom icon support, balance deduction, sub-categories, responsive design
- Created BiometricAuth component with WebAuthn + Capacitor support
- Created PinLockScreen component with number pad and biometric fallback
- Updated MorePage with Security & Privacy section (biometric + PIN)
- Updated main page.tsx with PIN lock screen, FCM initialization, biometric/PIN state management
- Added responsive CSS for all phone sizes (safe area, viewport height, font scaling, landscape, Capacitor)
- Generated app icons from uploaded image (all sizes 72-512px + apple-touch-icon)
- Created Capacitor configs for both com.applenet.app and com.applenet.admin
- Generated Android keystore with SHA1/SHA256 keys
- Created GitHub Actions CI/CD pipeline (.github/workflows/build.yml)
- Added GitHub secrets (FIREBASE_ADMIN_SDK, GOOGLE_SERVICES_USER, GOOGLE_SERVICES_ADMIN)
- Fixed multiple CI issues: lockfile, Bun setup, Node 22 for Capacitor, Java 21 for Gradle, static export config
- Successfully pushed to GitHub and completed clean build

Stage Summary:
- All builds passing: Next.js ✅, Android User APK ✅, Android Admin APK ✅
- Release v0.2.0 created with APK artifact
- SHA1: C9:DA:33:A9:EF:88:69:F0:DA:94:CF:67:DF:C8:BA:8A:DA:A7:81:19
- SHA256: B9:E8:3F:28:40:92:40:FE:2E:D5:9D:9D:5A:50:7C:FD:FE:42:D5:A2:F7:8C:31:0F:C1:4B:87:27:63:D0:61:67
