import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createDynamicSupabaseClient } from "@/lib/supabase";

const BUCKET_NAME = "documents";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { path, expiresIn = 604800 } = body; // Default 7 days (60 * 60 * 24 * 7)

    if (!path) {
      return NextResponse.json({ error: "File path is required" }, { status: 400 });
    }
    
    // Ensure user only shares their own files securely
    if (!path.startsWith(`${userId}/`)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const { supabaseUrl, supabaseAnonKey } = user.privateMetadata as {
      supabaseUrl?: string;
      supabaseAnonKey?: string;
    };

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 400 }
      );
    }

    const secret = process.env.CLERK_SECRET_KEY?.substring(0, 32) || "fallback_secret";
    const sig = crypto
      .createHmac("sha256", secret)
      .update(path)
      .digest("hex")
      .substring(0, 12);
      
    const token = Buffer.from(`${path}::${sig}`).toString("base64url");
    const shortUrl = `${new URL(req.url).origin}/s/${token}`;

    return NextResponse.json({ url: shortUrl });
  } catch (error) {
    console.error("Share generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate share link" },
      { status: 500 }
    );
  }
}
