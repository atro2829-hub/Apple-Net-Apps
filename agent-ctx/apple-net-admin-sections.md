# Task: Create 8 Admin Section Components for Apple.NET

## Summary
Created 8 professional React section components for the Apple.NET admin panel, all with Arabic labels, Firebase RTDB integration, emerald green accent styling, and self-contained state management.

## Files Created/Updated

1. **DepositsSection.tsx** - Deposit request management
   - Lists deposit requests from `depositRequests/` in RTDB
   - Pending deposits highlighted at top with amber border/strip
   - Approve with `runTransaction` for atomic balance update
   - Reject with reason via dialog
   - Sends notification and logs activity on approve/reject
   - Filter by status (pending/approved/rejected)
   - Search by name, email, reference number, bank name
   - Stats cards showing counts per status

2. **BalancesSection.tsx** - User balance management
   - Search users by name/email/phone
   - Display user info card with current balance
   - Credit (deposit) form with amount and description
   - Debit (withdraw) form with sufficient balance check
   - `runTransaction` for atomic balance updates
   - Saves history to `users/{uid}/creditHistory/`
   - Sends notifications on balance changes
   - Credit history display with colored badges

3. **TiersSection.tsx** - Price tier management
   - Props: `{ managedNetwork?: string }`
   - Lists tiers from `tiers/` or `networkTiers/{networkId}/` based on managedNetwork
   - Add/edit tier dialog: price, data amount, duration, icon
   - Delete tier with confirmation dialog
   - Card-based grid layout with hover actions
   - Sorted by price ascending

4. **StarlinkSection.tsx** - Starlink products & orders
   - Tab-like sub-navigation between Products and Orders
   - Products: CRUD from `starlinkProducts/` with name, description, priceUSD, quantity, specs (download/upload/latency/coverage), active toggle
   - Image upload using `compressImageToBase64` from `@/lib/utils`
   - Orders: List from `starlinkOrders/` with status flow (pending→confirmed→shipped→delivered/cancelled)
   - Status change sends notifications to users

5. **BanksSection.tsx** - Bank details CRUD
   - CRUD for bank details from `banks/` in RTDB
   - Fields: bankName, accountName, accountNumber, isActive toggle
   - Card-based grid with status strip
   - Active/inactive toggle and count display

6. **CommissionsSection.tsx** - Commission management
   - Props: `{ managedNetwork?: string }`
   - Three sub-tabs: entries, payouts, settings
   - Commission settings from `commissionSettings/` - rate per manager/network
   - Commission entries from `commissionEntries/` - list of earned commissions
   - Monthly payouts from `monthlyPayouts/` - mark as paid
   - Filters by month and search
   - Stats cards for unpaid/paid totals

7. **SettingsSection.tsx** - App & network settings
   - Props: `{ managedNetwork?: string }`
   - App settings (when no managedNetwork): adminWhatsApp, maxBalance, maintenanceMode, appVersion, downloadUrl, updateMessage
   - Network settings (when managedNetwork): name, phone, province, district, location, IP, image upload, coverage, speed
   - Save with `update(ref(db, "settings/"), {...})`
   - Image upload for network using `compressImageToBase64`

8. **ActivityLogSection.tsx** - Activity log viewer
   - Reads from `activityLog/` in RTDB
   - Displays list of actions with type, user, target, timestamp
   - Filter by action type (deposit_approved, card_added, etc.)
   - Search by user, target, details
   - Paginated list (20 per page)
   - Placeholder message when `activityLog/` doesn't exist in RTDB
   - Relative time display (منذ 5 دقائق, منذ ساعة, etc.)

## Technical Details
- All components use `"use client"` directive
- Consistent import pattern: React, motion, Firebase, toast, Button, Input
- All labels in Arabic
- Emerald green accent color scheme throughout
- Professional Tailwind styling with dark mode support
- Each component is self-contained with its own `onValue` listeners and `useState` hooks
- Proper error handling with toast notifications
- Activity logging for admin actions
