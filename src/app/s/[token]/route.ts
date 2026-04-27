import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { createDynamicSupabaseClient } from "@/lib/supabase";
import crypto from "crypto";

export async function GET(req: Request, props: { params: Promise<{ token: string }> }) {
  try {
    const params = await props.params;
    const { token } = params;
    if (!token) return new NextResponse("Invalid link", { status: 400 });

    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const [path, sig] = decoded.split("::");
    
    if (!path || !sig) {
      return new NextResponse("Invalid link structure", { status: 400 });
    }

    const secret = process.env.CLERK_SECRET_KEY?.substring(0, 32) || "fallback_secret";
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(path)
      .digest("hex")
      .substring(0, 12);
    
    if (sig !== expectedSig) {
      return new NextResponse("Forbidden: Link tampered or invalid", { status: 403 });
    }

    const userId = path.split("/")[0];
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const { supabaseUrl, supabaseAnonKey } = (user.privateMetadata || {}) as {
      supabaseUrl?: string;
      supabaseAnonKey?: string;
    };

    if (!supabaseUrl || !supabaseAnonKey) {
      return new NextResponse("Resource unavailable: missing backing credentials", { status: 404 });
    }

    const supabase = createDynamicSupabaseClient(supabaseUrl, supabaseAnonKey);
    // Generate a fresh 1-hour signed URL dynamically when the visitor hits the link.
    const { data } = await supabase.storage.from("documents").createSignedUrl(path, 3600); 
    
    if (!data?.signedUrl) {
      return new NextResponse("File not found or expired", { status: 404 });
    }

    return NextResponse.redirect(data.signedUrl);
  } catch (err) {
    console.error("Link redirect error:", err);
    return new NextResponse("Server error parsing link", { status: 500 });
  }
}
