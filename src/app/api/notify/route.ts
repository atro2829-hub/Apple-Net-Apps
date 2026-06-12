import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { db, messaging } = await getFirebaseAdmin();
    const body = await request.json();
    const { uid, title, body: messageBody, type, data, pinned } = body;

    if (!uid || !title || !messageBody || !type) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: uid, title, body, type" },
        { status: 400 }
      );
    }

    // Get the user's FCM token from Firebase RTDB
    const fcmTokenSnapshot = await db.ref(`users/${uid}/fcmToken`).once("value");
    const fcmToken = fcmTokenSnapshot.val();

    const notificationId = `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Build the notification object to save
    const notificationData: Record<string, unknown> = {
      id: notificationId,
      title,
      body: messageBody,
      type,
      read: false,
      createdAt: Date.now(),
    };

    if (data) notificationData.data = data;
    if (pinned !== undefined) notificationData.pinned = pinned;

    // Save notification to Firebase RTDB
    await db.ref(`notifications/${uid}/${notificationId}`).set(notificationData);

    // If pinned, also save to pinned sub-path
    if (pinned === true) {
      await db.ref(`notifications/${uid}/pinned/${notificationId}`).set(true);
    }

    // Send FCM message if token exists
    let messageId: string | null = null;
    if (fcmToken) {
      try {
        messageId = await messaging.send({
          token: fcmToken,
          notification: { title, body: messageBody },
          data: { type, notificationId, ...(data || {}) },
          android: { priority: "high" as const },
          apns: {
            payload: {
              aps: { sound: "default", badge: 1 },
            },
          },
        });
      } catch {
        // FCM token might be invalid or expired - notification still saved
      }
    }

    return NextResponse.json({
      success: true,
      messageId: messageId || "saved_only",
      notificationId,
    });
  } catch (error) {
    console.error("Notify API error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
