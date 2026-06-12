import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDeQMrepTnlldqGycyMzy1qeoaD3g7nxgA",
  authDomain: "applenet711.firebaseapp.com",
  databaseURL: "https://applenet711-default-rtdb.firebaseio.com",
  projectId: "applenet711",
  storageBucket: "applenet711.firebasestorage.app",
  messagingSenderId: "164323561264",
  appId: "1:164323561264:android:2000f0cc595b6d7260c2f5",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getDatabase(app);

// Lazy-init messaging (only supported in browsers with service workers)
let messagingInstance: ReturnType<typeof getMessaging> | null = null;
export async function getMessagingInstance() {
  if (messagingInstance) return messagingInstance;
  const supported = await isSupported();
  if (supported) {
    messagingInstance = getMessaging(app);
    return messagingInstance;
  }
  return null;
}

export default app;
