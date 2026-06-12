---
Task ID: 1
Agent: Main Agent
Task: Complete rebuild of admin app with new UX/UI + size optimizations

Work Log:
- Analyzed project structure and identified size bloat sources (15MB public/, 2.6MB JS bundles)
- Deleted 14 unnecessary files: iOS-only splash screens (9.5MB), duplicate Arabic images, opengraph.jpg
- Reduced public/ from 15MB to 3.8MB (75% reduction)
- Redesigned AdminApp.tsx with professional mobile-first UI: Navigation Drawer + Bottom Navigation + Dashboard cards
- Updated AdminLogin.tsx with enhanced biometric login, credential storage, no registration
- Fixed admin page.tsx root route handling for Capacitor compatibility
- Updated ReportsSection.tsx with visible PDF path display modal + copy to clipboard
- Updated next.config.ts with optimizePackageImports for lucide-react, date-fns, recharts, framer-motion
- Updated build.yml with minifyEnabled + shrinkResources for both APKs
- Cleaned up root layout.tsx (removed deleted iOS splash references)
- Pushed to GitHub and triggered build
- Both APKs built successfully: 7.8MB each (down from ~25-30MB)

Stage Summary:
- Admin app redesigned with professional UX/UI (drawer + bottom nav + dashboard)
- App sizes reduced by ~70% (7.8MB vs 25-30MB)
- PDF download shows visible file path modal
- Biometric login enhanced with secure credential storage
- Build succeeded with minification enabled
