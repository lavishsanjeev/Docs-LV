import { redirect } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { createDynamicSupabaseClient } from "@/lib/supabase";
import { FileIcon, Download, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

function ErrorPage({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center py-20 px-4">
      <div className="w-full max-w-md text-center space-y-4">
        <AlertTriangle className="h-16 w-16 text-muted-foreground/40 mx-auto" />
        <h1 className="text-2xl font-heading font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
    </div>
  );
}

export default async function SharedFilesPage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const { token } = params;

  if (!token) {
    return <ErrorPage title="Invalid Link" message="This share link is not valid." />;
  }

  // Token is formatted as userId-shortId
  const lastDashIndex = token.lastIndexOf('-');
  if (lastDashIndex === -1) {
    return <ErrorPage title="Invalid Link Format" message="This share link has an invalid format. Please check the URL and try again." />;
  }
  
  const userId = token.substring(0, lastDashIndex);
  const shortId = token.substring(lastDashIndex + 1);

  if (!userId || !shortId) {
    return <ErrorPage title="Invalid Link" message="This share link is missing required parameters." />;
  }

  // Wrap all Clerk/Supabase calls in try-catch to handle invalid tokens gracefully
  let supabaseUrl: string | undefined;
  let supabaseAnonKey: string | undefined;

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const meta = (user.privateMetadata || {}) as {
      supabaseUrl?: string;
      supabaseAnonKey?: string;
    };
    supabaseUrl = meta.supabaseUrl;
    supabaseAnonKey = meta.supabaseAnonKey;
  } catch (error) {
    console.error("Share page: failed to fetch user for token:", token, error);
    return <ErrorPage title="Link Expired" message="This share link is no longer valid. The file owner may have changed their settings." />;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return <ErrorPage title="Unavailable" message="The file owner's storage is not configured. Files cannot be accessed." />;
  }

  let supabase;
  try {
    supabase = createDynamicSupabaseClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error("Share page: failed to create supabase client:", error);
    return <ErrorPage title="Service Error" message="Could not connect to the storage service. Please try again later." />;
  }
  
  // Fetch the share JSON file
  let paths: string[] = [];
  try {
    const { data: fileData, error: fileError } = await supabase.storage
      .from("documents")
      .download(`${userId}/.share/${shortId}.json`);
      
    if (fileError || !fileData) {
      return <ErrorPage title="Link Expired" message="This share link has expired or the shared files have been removed." />;
    }
    
    const textContent = await fileData.text();
    const json = JSON.parse(textContent);
    paths = json.paths || [];
  } catch (error) {
    console.error("Share page: failed to download share file:", error);
    return <ErrorPage title="Link Expired" message="This share link has expired or is no longer accessible." />;
  }
  
  if (paths.length === 0) {
    return <ErrorPage title="No Files" message="No files were found in this share link." />;
  }
  
  // If single file, redirect directly to the signed URL
  if (paths.length === 1) {
    try {
      const { data } = await supabase.storage.from("documents").createSignedUrl(paths[0], 3600); 
      if (!data?.signedUrl) {
        return <ErrorPage title="File Not Found" message="The shared file could not be found or has expired." />;
      }
      redirect(data.signedUrl);
    } catch (error) {
      console.error("Share page: failed to create signed URL:", error);
      return <ErrorPage title="Error" message="Could not generate a download link. Please try again." />;
    }
  }

  // Multiple files - render the shared files page
  let signedUrlsData: { signedUrl: string | null; error: string | null; path: string | null }[] = [];
  try {
    const { data } = await supabase.storage.from("documents").createSignedUrls(paths, 3600);
    signedUrlsData = data || [];
  } catch (error) {
    console.error("Share page: failed to create signed URLs:", error);
    return <ErrorPage title="Error" message="Could not generate download links. Please try again." />;
  }

  if (signedUrlsData.length === 0) {
    return <ErrorPage title="Files Unavailable" message="The shared files could not be found or have expired." />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-20 px-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-heading font-bold tracking-tight">Shared Securely</h1>
          <p className="text-muted-foreground">This secure link will expire in 1 hour.</p>
        </div>
        
        <div className="bg-secondary/20 border border-border/50 rounded-2xl p-4 space-y-3 shadow-sm">
          {signedUrlsData.map((item, i) => {
             const filename = paths[i]?.split("/").pop()?.replace(/^\d+_/, "") || "Unknown File";
             return (
               <div key={i} className="flex items-center justify-between p-3 bg-background rounded-xl border border-border/50 shadow-sm transition-all hover:border-primary/30">
                 <div className="flex items-center gap-3 overflow-hidden">
                   <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                     <FileIcon className="h-5 w-5 text-primary" />
                   </div>
                   <span className="font-medium text-sm truncate">{filename}</span>
                 </div>
                 {item.signedUrl ? (
                   <a href={item.signedUrl} target="_blank" rel="noopener noreferrer">
                     <Button variant="secondary" size="sm" className="shrink-0 gap-2 font-medium">
                       <Download className="h-4 w-4" /> Download
                     </Button>
                   </a>
                 ) : (
                   <span className="text-sm text-destructive font-medium px-3 py-1 bg-destructive/10 rounded-md">Expired</span>
                 )}
               </div>
             );
          })}
        </div>
      </div>
    </div>
  );
}
