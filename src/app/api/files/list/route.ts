import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createDynamicSupabaseClient } from "@/lib/supabase";

const BUCKET_NAME = "documents";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(userId, {
        limit: 100,
        offset: 0,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      console.error("List files error:", error);
      return NextResponse.json(
        { error: `Failed to list files: ${error.message}` },
        { status: 500 }
      );
    }

    // Filter out the .emptyFolderPlaceholder and hidden folders like .share
    const files = (data || [])
      .filter((f) => f.name !== ".emptyFolderPlaceholder" && f.name !== ".share" && !f.name.startsWith(".share/"))
      .map((f) => ({
        name: f.name,
        size: f.metadata?.size || 0,
        createdAt: f.created_at,
        type: f.metadata?.mimetype || "unknown",
        path: `${userId}/${f.name}`,
        url: "",
      }));

    if (files.length > 0) {
      // Generate signed URLs valid for 1 hour (3600 seconds)
      const pathsToSign = files.map((f) => f.path);
      const { data: signedData, error: signError } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrls(pathsToSign, 3600);

      if (!signError && signedData) {
        files.forEach((file, index) => {
          file.url = signedData[index]?.signedUrl || "";
        });
      } else if (signError) {
        console.error("Failed to sign URLs:", signError);
      }
    }

    return NextResponse.json({ files });
  } catch (error) {
    console.error("List files failed:", error);
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 }
    );
  }
}
