"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, CreditCard, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill: { name: string; email: string };
  theme: { color: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export default function PaymentPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (isLoaded && user?.publicMetadata?.hasPaid) {
      router.replace("/dashboard");
    }
  }, [isLoaded, user, router]);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Create order
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(orderData.error || "Failed to create order");
      }

      // 2. Open Razorpay checkout
      const options: RazorpayOptions = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: 100,
        currency: "INR",
        name: "Docs LV",
        description: "One-time access payment",
        order_id: orderData.orderId,
        handler: async (response: RazorpayResponse) => {
          try {
            // 3. Verify payment
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              setPaid(true);
              toast.success("Payment successful! Redirecting...");
              setTimeout(() => router.push("/dashboard"), 1500);
            } else {
              toast.error("Payment verification failed. Please try again.");
            }
          } catch {
            toast.error("Payment verification error.");
          }
          setLoading(false);
        },
        prefill: {
          name: user.fullName || "",
          email: user.primaryEmailAddress?.emailAddress || "",
        },
        theme: { color: "#7c5cfc" },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to initiate payment. Please try again.");
      setLoading(false);
    }
  }, [user, router]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/3 h-[400px] w-[400px] rounded-full bg-[oklch(0.85_0.15_280/30%)] blur-[100px] animate-pulse-glow" />
      </div>

      <Card className="relative z-10 w-full max-w-md glass border-0">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            {paid ? (
              <CheckCircle className="h-8 w-8 text-green-400" />
            ) : (
              <CreditCard className="h-8 w-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {paid ? "Payment Complete!" : "Unlock Docs LV"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {paid
              ? "You now have lifetime access. Redirecting..."
              : "One-time payment of ₹1 to unlock lifetime access"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!paid && (
            <>
              <div className="rounded-xl bg-secondary/50 p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">Lifetime Access</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Features</span>
                  <span className="font-medium">Unlimited Files</span>
                </div>
                <div className="border-t border-border/50 pt-3 flex items-center justify-between">
                  <span className="font-medium">Total</span>
                  <span className="text-2xl font-bold gradient-text">₹1</span>
                </div>
              </div>

              <Button
                onClick={handlePayment}
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-base py-6"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-5 w-5" />
                    Pay ₹1 &amp; Unlock
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Secured by Razorpay. 100% safe payment.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
