import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { db, messaging } = await getFirebaseAdmin();
    const body = await request.json();
    const { type, uid, data } = body;

    if (!type || !uid) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Determine notification content based on transaction type
    let title = "";
    let bodyText = "";
    let notificationType = type;

    switch (type) {
      case "deposit_approved":
        title = "تم قبول الإيداع";
        bodyText = `تم قبول إيداعك بمبلغ ${data?.amount || 0} ريال بنجاح`;
        notificationType = "deposit_approved";
        break;
      case "deposit_rejected":
        title = "تم رفض الإيداع";
        bodyText = `تم رفض إيداعك بمبلغ ${data?.amount || 0} ريال`;
        notificationType = "deposit_rejected";
        break;
      case "new_deposit_request":
        title = "طلب إيداع جديد";
        bodyText = `طلب إيداع جديد من ${data?.userName || "مستخدم"} بمبلغ ${data?.amount || 0} ريال`;
        // This goes to admin
        break;
      case "telecom_order_approved":
        title = "تم قبول طلب الاتصالات";
        bodyText = `تم تنفيذ طلبك لشبكة ${data?.networkName || ""} بنجاح`;
        break;
      case "telecom_order_rejected":
        title = "تم رفض طلب الاتصالات";
        bodyText = `تم رفض طلبك لشبكة ${data?.networkName || ""}`;
        break;
      case "new_telecom_order":
        title = "طلب اتصالات جديد";
        bodyText = `طلب شحن ${data?.packageName || ""} لشبكة ${data?.networkName || ""}`;
        break;
      case "card_purchased":
        title = "تم شراء كرت بنجاح";
        bodyText = `تم شراء ${data?.cardName || "كرت"} بنجاح`;
        break;
      case "gift_received":
        title = "هدية جديدة!";
        bodyText = `لقد استلمت هدية بقيمة ${data?.amount || 0} ريال`;
        break;
      case "subscription_activated":
        title = "تم تفعيل الاشتراك";
        bodyText = `تم تفعيل اشتراك ${data?.planName || ""} بنجاح`;
        break;
      default:
        title = data?.title || "Apple.NET";
        bodyText = data?.body || "";
    }

    // Save notification to Firebase RTDB
    const notifRef = db.ref(`notifications/${uid}`).push();
    const notificationData = {
      id: notifRef.key,
      title,
      body: bodyText,
      type: notificationType,
      data: data || {},
      read: false,
      pinned: data?.pinned || false,
      createdAt: Date.now(),
    };
    await notifRef.set(notificationData);

    // If pinned, also save to pinned path
    if (data?.pinned) {
      await db.ref(`notifications/${uid}/pinned/${notifRef.key}`).set(true);
    }

    // Try to send FCM push notification
    try {
      const tokenSnap = await db.ref(`users/${uid}/fcmToken`).once("value");
      const fcmToken = tokenSnap.val();

      if (fcmToken) {
        await messaging.send({
          token: fcmToken,
          notification: {
            title,
            body: bodyText,
          },
          data: {
            type: notificationType,
            ...(data || {}),
          },
          android: {
            notification: {
              icon: "ic_stat_icon_config_sample",
              color: "#1B7A3D",
              sound: "default",
              tag: notifRef.key || undefined,
              clickAction: "FCM_PLUGIN_ACTIVITY",
            },
            priority: "high" as const,
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
                badge: 1,
                "mutable-content": 1,
              },
            },
          },
        });
      }
    } catch (pushError) {
      console.warn("[Push] FCM send failed:", pushError);
      // Notification saved to RTDB even if push fails
    }

    return NextResponse.json({
      success: true,
      notificationId: notifRef.key,
    });
  } catch (error) {
    console.error("[Notify Transaction] Error:", error);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
