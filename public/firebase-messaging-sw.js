// ─── Firebase Cloud Messaging Service Worker ──────────────
// This handles push notifications when the app is closed
// Firebase Messaging automatically uses this file

importScripts('https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging-compat.js');

// Firebase configuration
firebase.initializeApp({
  apiKey: "AIzaSyDeQMrepTnlldqGycyMzy1qeoaD3g7nxgA",
  authDomain: "applenet711.firebaseapp.com",
  databaseURL: "https://applenet711-default-rtdb.firebaseio.com",
  projectId: "applenet711",
  storageBucket: "applenet711.firebasestorage.app",
  messagingSenderId: "164323561264",
  appId: "1:164323561264:android:2000f0cc595b6d7260c2f5",
});

// Retrieve Firebase Messaging instance
const messaging = firebase.messaging();

// Handle background messages (when app is closed or in background)
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM-SW] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'Apple.NET';
  const notificationOptions = {
    body: payload.notification?.body || 'لديك إشعار جديد',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    dir: 'rtl',
    lang: 'ar',
    vibrate: [100, 50, 100],
    data: {
      url: payload.data?.url || '/',
      type: payload.data?.type || 'general',
      ...payload.data,
    },
    actions: [
      { action: 'open', title: 'فتح' },
      { action: 'dismiss', title: 'إغلاق' },
    ],
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(urlToOpen);
    })
  );
});
