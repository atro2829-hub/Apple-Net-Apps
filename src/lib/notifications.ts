"use client";

// Notification System for Apple.NET with FCM Push Support

const NOTIFICATION_PREF_KEY = "applenet_notifications_enabled";
const FCM_TOKEN_KEY = "applenet_fcm_token";

/**
 * Check if notifications are supported in this browser
 */
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Check if user has enabled notifications
 */
export function isNotificationEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(NOTIFICATION_PREF_KEY) === "true";
}

/**
 * Save notification preference
 */
export function setNotificationPreference(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTIFICATION_PREF_KEY, enabled ? "true" : "false");
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<{
  granted: boolean;
  permission: NotificationPermission | "unsupported";
}> {
  if (!isNotificationSupported()) {
    return { granted: false, permission: "unsupported" };
  }

  try {
    const permission = await Notification.requestPermission();
    const granted = permission === "granted";
    setNotificationPreference(granted);
    return { granted, permission };
  } catch {
    return { granted: false, permission: "denied" };
  }
}

/**
 * Show a local notification using the Notification API
 */
export function showLocalNotification(options: {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: Record<string, unknown>;
  onClick?: () => void;
}): void {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      dir: "rtl",
      lang: "ar",
      tag: options.tag || "applenet-notification",
      data: options.data || {},
      vibrate: [100, 50, 100],
    });

    if (options.onClick) {
      notification.onclick = () => {
        window.focus();
        notification.close();
        options.onClick?.();
      };
    }

    setTimeout(() => notification.close(), 5000);
  } catch {
    // Notification creation failed silently
  }
}

/**
 * Save FCM token to localStorage
 */
export function saveFCMToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FCM_TOKEN_KEY, token);
}

/**
 * Get saved FCM token
 */
export function getFCMToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(FCM_TOKEN_KEY);
}

/**
 * Remove FCM token
 */
export function removeFCMToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(FCM_TOKEN_KEY);
}

/**
 * Initialize FCM push notifications and register token
 * Call this after user logs in
 */
export async function initFCMToken(uid: string): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    // Dynamic import to avoid SSR issues
    const { getMessagingInstance } = await import("@/lib/firebase");
    const messaging = await getMessagingInstance();
    
    if (!messaging) {
      // Fallback: try Capacitor Push Notifications
      return await initCapacitorPush(uid);
    }

    const { getToken, onMessage } = await import("firebase/messaging");
    
    // Get FCM token
    const currentToken = await getToken(messaging, {
      vapidKey: "BEl62jGME5RCp0D8y5CKNP9GR3P9CDLdL3mfHVhhXo8JcQGm3F4D3L3M2N5K8P1R2T6W9X4Y7Z0A3B6C9D2E5F8", // Will be replaced with actual VAPID key
    });

    if (currentToken) {
      saveFCMToken(currentToken);
      
      // Save token to Firebase RTDB for server-side access
      const { db } = await import("@/lib/firebase");
      const { ref, update } = await import("firebase/database");
      await update(ref(db, `users/${uid}`), { fcmToken: currentToken });
      
      // Listen for foreground messages
      onMessage(messaging, (payload) => {
        if (payload.notification) {
          showLocalNotification({
            title: payload.notification.title || "Apple.NET",
            body: payload.notification.body || "",
            data: payload.data as Record<string, unknown> || {},
          });
        }
      });
      
      return currentToken;
    }
    
    return null;
  } catch (error) {
    console.warn("[FCM] Token generation failed:", error);
    // Try Capacitor as fallback
    return await initCapacitorPush(uid);
  }
}

/**
 * Initialize Capacitor Push Notifications (native app)
 */
async function initCapacitorPush(uid: string): Promise<string | null> {
  try {
    if (typeof window === "undefined" || !("Capacitor" in window)) return null;

    const { PushNotifications } = await import("@capacitor/push-notifications");
    
    // Request permission
    const permResult = await PushNotifications.requestPermissions();
    
    if (permResult.receive === "granted") {
      // Register for push
      await PushNotifications.register();
      
      // Listen for registration token
      return new Promise((resolve) => {
        PushNotifications.addListener("registration", async (token) => {
          saveFCMToken(token.value);
          
          // Save to Firebase
          const { db } = await import("@/lib/firebase");
          const { ref, update } = await import("firebase/database");
          await update(ref(db, `users/${uid}`), { fcmToken: token.value });
          
          resolve(token.value);
        });
        
        // Listen for push notifications received in foreground
        PushNotifications.addListener("pushNotificationReceived", (notification) => {
          showLocalNotification({
            title: notification.title || "Apple.NET",
            body: notification.body || "",
          });
        });
        
        // Handle notification action
        PushNotifications.addListener("pushNotificationActionPerformed", () => {
          window.focus();
        });
        
        // Timeout after 10s
        setTimeout(() => resolve(null), 10000);
      });
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Initialize notification system
 */
export async function initNotifications(): Promise<void> {
  if (!isNotificationSupported()) return;
  
  if (isNotificationEnabled() && Notification.permission !== "granted") {
    setNotificationPreference(false);
  }
}

/**
 * Send a test notification
 */
export function sendTestNotification(): void {
  showLocalNotification({
    title: "Apple.NET",
    body: "مرحبًا! الإشعارات تعمل بشكل صحيح",
    tag: "test-notification",
  });
}
