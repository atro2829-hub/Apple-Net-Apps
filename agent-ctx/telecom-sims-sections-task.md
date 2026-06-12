# Task: TelecomSection & SimsSection Components

## Summary
Created 2 full React component files for the Apple.NET admin panel:

### File 1: `/home/z/my-project/src/components/admin/sections/TelecomSection.tsx`
- **Sub-navigation**: 3 tabs (مزودين | شبكات | باقات) with emerald green accents
- **Providers Sub-view**: CRUD with Firebase RTDB `telecomProviders/`, modal with name/nameEn, apiUrl, apiKey, method (POST/GET), headers (key-value pairs), bodyTemplate, responseMapping (successField, messageField, transactionIdField), balanceCheckUrl, isActive toggle. Card-based list.
- **Networks Sub-view**: CRUD with Firebase RTDB `telecomNetworks/`, modal with name/nameEn, color/bgColor, icon upload → compressImageToBase64 → iconBase64, prefixes, providerId dropdown, subCategories (add/remove with name/nameEn/regionCode). Shows icon next to network name. Card layout with network color accent bar.
- **Packages Sub-view**: CRUD with Firebase RTDB `telecomPackages/`, modal with name/nameEn, price, wholesalePrice, description/descriptionEn, dataAmount, duration+durationUnit, type (recharge/internet/voice), productCode, networkId dropdown, subCategoryId dropdown (from selected network), isActive. Filter by network and type. Card-based list with price and data info.

### File 2: `/home/z/my-project/src/components/admin/sections/SimsSection.tsx`
- **SIM card management**: CRUD with Firebase RTDB `sims/`
- **Add/Edit form**: name, price, description, imageUrl (upload or URL input with compressImageToBase64), isAvailable toggle
- **Delete with confirmation** dialog
- **Grid-based card layout** (responsive 1/2/3/4 columns) with image preview
- **Search** by name
- **Price formatted** with `toLocaleString()` commas
- **Stats cards**: total, available, unavailable counts
- **Availability badge** overlay on image

### Common Features
- Arabic labels throughout with emerald green (#10b981) accents
- Firebase RTDB with onValue real-time listeners
- Self-contained with own useState hooks
- Framer Motion animations (AnimatePresence, layout, scale/opacity transitions)
- Custom toggle switches (not using shadcn Switch for style consistency)
- Delete confirmation dialogs with red accent
- Toast notifications via sonner
- RTL layout (dir="rtl")
- Responsive design (mobile-first)
- No lint errors in the new files
