import { auth } from "@clerk/nextjs/server";
import { razorpayInstance } from "@/lib/razorpay";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await razorpayInstance.orders.create({
      amount: 100, // ₹1 in paise
      currency: "INR",
      receipt: `rcpt_${userId.slice(-10)}_${Date.now()}`,
    });

    return NextResponse.json({ orderId: order.id });
  } catch (error) {
    console.error("Razorpay order creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
