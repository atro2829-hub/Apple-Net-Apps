import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { db } = await getFirebaseAdmin();
    const body = await request.json();
    const { uid, phoneNumber, packageId, networkId, amount } = body;

    if (!uid || !phoneNumber || !packageId || !networkId || !amount) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: uid, phoneNumber, packageId, networkId, amount" },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    // Get network name for the description
    const networkSnapshot = await db.ref(`telecomNetworks/${networkId}`).once("value");
    const networkData = networkSnapshot.val();
    const networkName = networkData?.name || networkId;
    const networkNameEn = networkData?.nameEn || networkId;

    // Use Firebase RTDB transaction to deduct amount from user's balance
    const balanceRef = db.ref(`credit/${uid}/amount`);
    let newBalance: number | null = null;
    let transactionError: string | null = null;

    await balanceRef.transaction((currentBalance) => {
      if (currentBalance === null) {
        transactionError = "User balance not found";
        return null; // Abort transaction
      }

      const balance = Number(currentBalance);
      if (balance < amount) {
        transactionError = `Insufficient balance. Current: ${balance}, Required: ${amount}`;
        return undefined; // Abort transaction without writing
      }

      newBalance = balance - amount;
      return newBalance;
    });

    if (transactionError) {
      return NextResponse.json(
        { success: false, error: transactionError },
        { status: 400 }
      );
    }

    if (newBalance === null) {
      return NextResponse.json(
        { success: false, error: "Failed to update balance" },
        { status: 500 }
      );
    }

    // Transaction succeeded - now create the related records
    const entryId = uuidv4();
    const orderId = uuidv4();
    const adminNotificationId = uuidv4();
    const now = Date.now();

    // 1. Add credit history entry
    const historyEntry = {
      type: "purchase",
      amount,
      description: `سداد اتصالات - ${networkName}`,
      descriptionEn: `Telecom Payment - ${networkNameEn}`,
      timestamp: now,
      phoneNumber,
      packageId,
      networkId,
    };
    await db.ref(`credit/${uid}/history/${entryId}`).set(historyEntry);

    // 2. Create telecom order
    const telecomOrder = {
      uid,
      phoneNumber,
      packageId,
      networkId,
      amount,
      status: "pending",
      createdAt: now,
    };
    await db.ref(`telecomOrders/${orderId}`).set(telecomOrder);

    // 3. Send notification to admin about new telecom order
    const adminNotification = {
      id: adminNotificationId,
      title: "طلب سداد اتصالات جديد",
      body: `طلب جديد من ${uid} - ${networkName} - ${amount}`,
      type: "new_telecom_order",
      data: {
        orderId,
        uid,
        phoneNumber,
        networkId,
        packageId,
        amount: String(amount),
      },
      read: false,
      createdAt: now,
    };
    await db.ref(`notifications/admin/${adminNotificationId}`).set(adminNotification);

    return NextResponse.json({
      success: true,
      newBalance,
      orderId,
      historyEntryId: entryId,
    });
  } catch (error) {
    console.error("Telecom purchase API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
