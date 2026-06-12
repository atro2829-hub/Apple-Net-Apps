# Task: Create Server-Side API Routes for Apple Net

## Summary
Created all 6 server-side API routes for push notifications and admin operations.

## Files Created

### 1. `/home/z/my-project/src/lib/firebase-admin.ts`
- Server-side Firebase Admin SDK initialization
- Uses `fs.readFileSync` + `JSON.parse` to load the service account key (avoids `require()` lint error)
- Exports `adminDb`, `adminAuth`, `adminMessaging`, and `admin` default

### 2. `/home/z/my-project/src/app/api/notify/route.ts`
- POST endpoint for sending push notifications to a specific user
- Accepts: `{ uid, title, body, type, data?, pinned? }`
- Gets FCM token from `users/{uid}/fcmToken`
- Sends FCM message via `adminMessaging.send()`
- Saves notification to `notifications/{uid}/{id}`
- If pinned, also saves to `notifications/{uid}/pinned/{id}`
- Returns `{ success, messageId, notificationId }`

### 3. `/home/z/my-project/src/app/api/notify/broadcast/route.ts`
- POST endpoint for broadcasting notifications to ALL users
- Accepts: `{ title, body, type, data?, pinned? }`
- Iterates over all users in RTDB to collect FCM tokens
- Uses `adminMessaging.sendEachForMulticast()` with 500-token batching
- Saves notification to each user's `notifications/{uid}` path
- Returns `{ success, sentCount, failureCount, totalUsers }`

### 4. `/home/z/my-project/src/app/api/telecom/purchase/route.ts`
- POST endpoint for telecom purchase with balance deduction
- Accepts: `{ uid, phoneNumber, packageId, networkId, amount }`
- Uses `balanceRef.transaction()` for atomic balance deduction (race-condition safe)
- On success: creates credit history entry, telecom order, admin notification
- Returns `{ success, newBalance, orderId, historyEntryId }`

### 5. `/home/z/my-project/src/app/api/upload/route.ts`
- POST endpoint for image upload
- Accepts FormData with a `file` field
- Validates: max 2MB, allowed formats (png, jpg, jpeg, svg, webp)
- Uses `sharp` to resize images to max 256x256
- SVG files are saved without processing
- Saves to `/public/uploads/{timestamp}-{uuid}.{ext}`
- Returns `{ success, url, filename }`

### 6. `/home/z/my-project/src/app/api/keystore/route.ts`
- GET endpoint to generate/extract SHA1 and SHA256 from Android keystore
- If keystore doesn't exist at `/home/z/my-project/keystore/apple-net.keystore`, creates one
- Uses `keytool` to generate keystore and extract fingerprints
- Returns `{ success, sha1, sha256, keystorePath, alias }`

## Lint Status
All files pass ESLint with zero errors/warnings.
