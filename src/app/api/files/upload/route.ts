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

    // Get Supabase credentials from private metadata
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const { supabaseUrl, supabaseAnonKey } = user.privateMetadata as {
      supabaseUrl?: string;
      supabaseAnonKey?: string;
    };

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Supabase not configured. Please add your credentials in Settings." },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const supabase = createDynamicSupabaseClient(supabaseUrl, supabaseAnonKey);

    // Upload to documents/{userId}/{filename}
    const filePath = `${userId}/${Date.now()}_${file.name}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      return NextResponse.json(
        { error: `Upload failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        path: data.path,
        size: file.size,
        type: file.type,
      },
    });
  } catch (error) {
    console.error("File upload failed:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
