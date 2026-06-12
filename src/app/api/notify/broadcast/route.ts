import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { db, messaging } = await getFirebaseAdmin();
    const body = await request.json();
    const { title, body: messageBody, type, data, pinned } = body;

    if (!title || !messageBody || !type) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: title, body, type" },
        { status: 400 }
      );
    }

    // Get ALL users from Firebase RTDB
    const usersSnapshot = await db.ref("users").once("value");
    const users = usersSnapshot.val();

    if (!users) {
      return NextResponse.json({ success: true, sentCount: 0, failureCount: 0, message: "No users found" });
    }

    // Collect all FCM tokens
    const tokens: string[] = [];
    const uids: string[] = [];

    for (const uid of Object.keys(users)) {
      const userData = users[uid];
      if (userData?.fcmToken) {
        tokens.push(userData.fcmToken);
      }
      uids.push(uid);
    }

    // Save notification to each user's path
    const savePromises = uids.map(async (uid) => {
      const notificationId = `bn_${Date.now()}_${uid.slice(0, 6)}`;
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

      await db.ref(`notifications/${uid}/${notificationId}`).set(notificationData);
      if (pinned === true) {
        await db.ref(`notifications/${uid}/pinned/${notificationId}`).set(true);
      }
    });

    await Promise.all(savePromises);

    // Send multicast FCM message
    let sentCount = 0;
    let failureCount = 0;

    if (tokens.length > 0) {
      try {
        const batchSize = 500;
        for (let i = 0; i < tokens.length; i += batchSize) {
          const batchTokens = tokens.slice(i, i + batchSize);
          const response = await messaging.sendEachForMulticast({
            tokens: batchTokens,
            notification: { title, body: messageBody },
            data: { type, ...(data || {}) },
            android: { priority: "high" as const },
            apns: { payload: { aps: { sound: "default", badge: 1 } } },
          });
          sentCount += response.successCount;
          failureCount += response.failureCount;
        }
      } catch {
        failureCount = tokens.length;
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      failureCount,
      totalUsers: uids.length,
    });
  } catch (error) {
    console.error("Broadcast API error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
