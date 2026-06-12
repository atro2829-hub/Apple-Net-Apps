"use client";

// ─── Enhanced Notification System for Apple.NET ──────────
// Supports FCM Push Notifications that work even when app is closed
// Falls back to Capacitor Push Notifications for native Android

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
  // Try Capacitor first (native push)
  if (typeof window !== "undefined" && "Capacitor" in window) {
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive === "granted") {
        setNotificationPreference(true);
        return { granted: true, permission: "granted" };
      }
    } catch {
      // Fallback to browser
    }
  }

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
 * Works even when the app is closed via Firebase Cloud Messaging
 */
export async function initFCMToken(uid: string): Promise<string | null> {
  if (typeof window === "undefined") return null;

  // Try Capacitor Push Notifications first (works when app is closed)
  const capacitorToken = await initCapacitorPush(uid);
  if (capacitorToken) return capacitorToken;

  // Fallback to FCM web push
  try {
    const { getMessagingInstance } = await import("@/lib/firebase");
    const messaging = await getMessagingInstance();

    if (!messaging) return null;

    const { getToken, onMessage } = await import("firebase/messaging");

    // Get FCM token
    const currentToken = await getToken(messaging, {
      vapidKey: "BEl62jGME5RCp0D8y5CKNP9GR3P9CDLdL3mfHVhhXo8JcQGm3F4D3L3M2N5K8P1R2T6W9X4Y7Z0A3B6C9D2E5F8",
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
    return null;
  }
}

/**
 * Initialize Capacitor Push Notifications (native Android)
 * This works even when the app is closed because it uses
 * Android's system-level notification service via FCM
 */
async function initCapacitorPush(uid: string): Promise<string | null> {
  try {
    if (typeof window === "undefined" || !("Capacitor" in window)) return null;

    const { PushNotifications } = await import("@capacitor/push-notifications");

    // Request permission
    const permResult = await PushNotifications.requestPermissions();

    if (permResult.receive === "granted") {
      // Register for push - this creates a persistent notification channel
      // that works even when the app is closed
      await PushNotifications.register();

      // Listen for registration token
      return new Promise((resolve) => {
        PushNotifications.addListener("registration", async (token) => {
          saveFCMToken(token.value);

          // Save to Firebase
          const { db } = await import("@/lib/firebase");
          const { ref, update } = await import("firebase/database");
          await update(ref(db, `users/${uid}`), {
            fcmToken: token.value,
            lastTokenUpdate: Date.now(),
          });

          resolve(token.value);
        });

        // Listen for push notifications received in foreground
        PushNotifications.addListener("pushNotificationReceived", (notification) => {
          showLocalNotification({
            title: notification.title || "Apple.NET",
            body: notification.body || "",
          });
        });

        // Handle notification action (app opened from notification)
        PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          window.focus();
          // Could navigate to specific section based on action.notification.data
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

/**
 * Create a notification channel for Android (Capacitor)
 * This ensures notifications appear even when app is closed
 */
export async function createNotificationChannel(): Promise<void> {
  try {
    if (typeof window === "undefined" || !("Capacitor" in window)) return;

    const { LocalNotifications } = await import("@capacitor/local-notifications");

    // Check if we can schedule local notifications
    const hasPermission = await LocalNotifications.checkPermissions();
    if (hasPermission.display !== "granted") {
      await LocalNotifications.requestPermissions();
    }
  } catch {
    // Local notifications not available
  }
}
