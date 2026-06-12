import { readFileSync } from "fs";
import { join } from "path";

let adminModule: typeof import("firebase-admin") | null = null;
let adminDb: import("firebase-admin").database.Database | null = null;
let adminAuth: import("firebase-admin").auth.Auth | null = null;
let adminMessaging: import("firebase-admin").messaging.Messaging | null = null;

export async function getFirebaseAdmin() {
  if (adminModule && adminDb && adminAuth && adminMessaging) {
    return { admin: adminModule, db: adminDb, auth: adminAuth, messaging: adminMessaging };
  }

  try {
    adminModule = await import("firebase-admin");

    if (!adminModule.apps.length) {
      const serviceAccountPath = join(process.cwd(), "firebase-admin-sdk.json");
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));

      adminModule.initializeApp({
        credential: adminModule.credential.cert(serviceAccount),
        databaseURL: "https://applenet711-default-rtdb.firebaseio.com",
      });
    }

    adminDb = adminModule.database();
    adminAuth = adminModule.auth();
    adminMessaging = adminModule.messaging();

    return { admin: adminModule, db: adminDb, auth: adminAuth, messaging: adminMessaging };
  } catch (error) {
    console.error("[Firebase Admin] Initialization failed:", error);
    throw new Error("Firebase Admin SDK not initialized. Make sure firebase-admin-sdk.json exists.");
  }
}

export default getFirebaseAdmin;
