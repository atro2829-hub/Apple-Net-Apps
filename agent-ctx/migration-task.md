# Task: Migrate Apple-Net Next.js Project

## Summary
Successfully migrated the Apple-Net project from `/home/z/my-project/Apple-Net-end-end-2/apple-project/` to the workspace at `/home/z/my-project/`.

## Steps Completed

### 1. Read and compared package.json files
- **Workspace**: Already had most dependencies (shadcn/ui, radix, tanstack, etc.)
- **Apple-project**: Had additional deps: firebase, jspdf, jspdf-autotable, @capacitor/* packages
- Both had identical: next, react, react-dom, all radix-ui packages, framer-motion, next-auth, etc.

### 2. Compared config files
- **tailwind.config.ts**: Both identical (same dark mode, colors, border-radius config)
- **components.json**: Both identical (new-york style, same aliases)
- **globals.css**: Apple-project had extensive custom CSS (737 lines) with brand colors, dark theme, app shell styles, glassmorphism, splash animations, iOS safe areas, etc. Copied over successfully.

### 3. Copied source files
- `src/` directory: 92 files from apple-project → workspace (workspace had 1 extra file `src/app/api/route.ts`)
- `public/` directory: 41 files including icons/, images/, splash/, uploads/ subdirectories
- `prisma/` directory: schema.prisma and dev.db copied over
- `tailwind.config.ts` also copied (identical, but copied for completeness)

### 4. Installed additional dependencies
- `firebase` (v12.14.0) - Firebase Realtime Database & Auth
- `jspdf` (v4.2.1) - PDF generation
- `jspdf-autotable` (v5.0.8) - PDF table generation
- `@capacitor/*` packages (android, cli, core, filesystem, haptics, ios, local-notifications, push-notifications)
- `@types/uuid` for TypeScript support

### 5. Updated next.config.ts
- Removed `output: "export"` (causes API routes to not work in dev)
- Added `trailingSlash: true`
- Removed `eslint` config (not supported in Next.js 16)
- Kept `typescript.ignoreBuildErrors: true`
- Added `images.unoptimized: true`
- Set `reactStrictMode: false`

### 6. Created .env and ran prisma db push
- Set `DATABASE_URL="file:./dev.db"` in .env
- System env var `DATABASE_URL` overrides to `file:/home/z/my-project/db/custom.db`
- Prisma db push completed successfully
- Database is in sync with schema

### 7. Verified dev server
- Page returns 200 status at `/`
- HTML renders with Arabic RTL layout, Apple.NET branding
- All component bundles load correctly (HomePage, AuthForm, etc.)
- No fatal compilation errors

## File Structure Verification

### Source files (src/):
- **lib/**: utils.ts, constants.ts, types.ts, i18n.ts, db.ts, firebase.ts, notifications.ts, cleanup.ts
- **components/**: 25+ page components (HomePage, AdminPanel, StarlinkPage, etc.) + 38 UI components
- **context/**: ThemeProvider.tsx, LanguageContext.tsx
- **hooks/**: use-toast.ts, use-mobile.tsx, use-mobile.ts
- **app/**: page.tsx, layout.tsx, globals.css, api/cleanup/route.ts, api/route.ts

### Public files:
- **icons/**: 10 icon files (72x72 to 512x512)
- **splash/**: 10 splash screen images
- **images/**: 9 images (screenshots, photos)
- **uploads/starlink/**: 3 starlink images
- Root: manifest.json, sw.js, favicon.svg, logo.svg, apple-touch-icon.png, opengraph.jpg, robots.txt

## Known Notes
- The initial page load had module not found errors for `firebase/database` and `jspdf` before packages were installed
- After installing packages and restarting, the page compiles and renders correctly
- The `eslint` config key is not supported in Next.js 16 and was removed
- The Prisma schema is minimal (User/Post models) as the app primarily uses Firebase for data
