import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createDynamicSupabaseClient } from "@/lib/supabase";

const BUCKET_NAME = "documents";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { path } = await req.json();

    if (!path || typeof path !== "string") {
      return NextResponse.json(
        { error: "File path is required" },
        { status: 400 }
      );
    }

    // Security: ensure the path belongs to this user
    if (!path.startsWith(`${userId}/`)) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
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

    const supabase = createDynamicSupabaseClient(supabaseUrl, supabaseAnonKey);

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error("Delete file error:", error);
      return NextResponse.json(
        { error: `Failed to delete file: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete file failed:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
