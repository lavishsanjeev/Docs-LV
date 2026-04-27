import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { validateSupabaseCredentials } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { supabaseUrl, supabaseAnonKey } = await req.json();

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Supabase URL and anon key are required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(supabaseUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid Supabase URL format" },
        { status: 400 }
      );
    }

    // Test credentials
    const isValid = await validateSupabaseCredentials(
      supabaseUrl,
      supabaseAnonKey
    );
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid Supabase credentials. Please check your URL and anon key." },
        { status: 400 }
      );
    }

    // Store securely in Clerk private metadata (never exposed to client)
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      privateMetadata: {
        supabaseUrl,
        supabaseAnonKey,
      },
      publicMetadata: {
        hasSupabase: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Supabase credentials storage failed:", error);
    return NextResponse.json(
      { error: "Failed to store credentials" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const hasSupabase = !!user.publicMetadata?.hasSupabase;

    return NextResponse.json({ hasSupabase });
  } catch (error) {
    console.error("Supabase credentials check failed:", error);
    return NextResponse.json(
      { error: "Failed to check credentials" },
      { status: 500 }
    );
  }
}
