import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing payment details" },
        { status: 400 }
      );
    }

    // Verify signature using HMAC SHA256
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    // Payment verified — update Clerk user metadata
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        hasPaid: true,
        paymentId: razorpay_payment_id,
        paidAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Payment verification failed:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
