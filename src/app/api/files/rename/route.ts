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

    const { path, newName } = await req.json();

    if (!path || typeof path !== "string" || !newName || typeof newName !== "string") {
      return NextResponse.json(
        { error: "File path and new name are required" },
        { status: 400 }
      );
    }

    // Validate that the new name is not empty or whitespace-only
    const trimmedName = newName.trim();
    if (trimmedName.length === 0) {
      return NextResponse.json(
        { error: "File name cannot be empty" },
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

    // Extract timestamp prefix if exists to preserve it
    const filename = path.split("/").pop() || "";
    const match = filename.match(/^(\d+_)(.+)$/);
    const prefix = match ? match[1] : "";

    const newPath = `${userId}/${prefix}${newName}`;

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
      .move(path, newPath);

    if (error) {
      console.error("Rename file error:", error);
      return NextResponse.json(
        { error: `Failed to rename file: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, newPath });
  } catch (error) {
    console.error("Rename file failed:", error);
    return NextResponse.json(
      { error: "Failed to rename file" },
      { status: 500 }
    );
  }
}
