"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Database, Loader2, CheckCircle, Copy } from "lucide-react";
import { toast } from "sonner";

interface SupabaseSetupFormProps {
  initialConnected: boolean;
}

export function SupabaseSetupForm({
  initialConnected,
}: SupabaseSetupFormProps) {
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(initialConnected);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supabaseUrl || !supabaseAnonKey) {
      toast.error("Both fields are required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/supabase/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supabaseUrl, supabaseAnonKey }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to connect");
      }

      setConnected(true);
      setSupabaseUrl("");
      setSupabaseAnonKey("");
      toast.success("Supabase connected successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to connect. Check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass border-0">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Supabase Connection</CardTitle>
            <CardDescription>
              Connect your own Supabase project for file storage
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {connected && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 p-3">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <p className="text-sm text-green-400">
              Supabase is connected. Submit again to update credentials.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supabase-url">Project URL</Label>
            <Input
              id="supabase-url"
              type="url"
              placeholder="https://your-project.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="bg-secondary/50 border-border/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supabase-anon-key">Anon Key</Label>
            <Input
              id="supabase-anon-key"
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              className="bg-secondary/50 border-border/50"
            />
            <p className="text-xs text-muted-foreground">
              Your anon key is stored securely and never exposed to the client.
            </p>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : connected ? (
              "Update Connection"
            ) : (
              "Connect Supabase"
            )}
          </Button>
        </form>

        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-border/50 bg-secondary/30 p-5">
            <h3 className="font-semibold text-foreground mb-1">Easy Setup (Recommended)</h3>
            <p className="text-xs text-muted-foreground mb-4">
              To instantly configure your Supabase bucket and security policies, copy this SQL snippet and run it in the <strong>SQL Editor</strong> section of your Supabase dashboard.
            </p>
            <div className="relative">
              <pre className="overflow-x-auto rounded-md bg-background/50 p-4 text-xs text-muted-foreground border border-border/30">
                <code>{`-- Create the documents bucket
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Create policy to allow all operations via anon
create policy "Allow Backend Operations"
on storage.objects for all
to anon
using (bucket_id = 'documents')
with check (bucket_id = 'documents');`}</code>
              </pre>
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 opacity-80 hover:opacity-100"
                onClick={() => {
                  navigator.clipboard.writeText(`-- Create the documents bucket\ninsert into storage.buckets (id, name, public)\nvalues ('documents', 'documents', false)\non conflict (id) do nothing;\n\n-- Create policy to allow all operations via anon\ncreate policy "Allow Backend Operations"\non storage.objects for all\nto anon\nusing (bucket_id = 'documents')\nwith check (bucket_id = 'documents');`);
                  toast.success("SQL copied to clipboard!");
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-secondary/30 p-4 text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Manual Setup Instructions:</p>
            <ol className="list-decimal ml-4 space-y-1">
              <li>Navigate to Storage and create a bucket named &ldquo;documents&rdquo;</li>
              <li>Under Storage → Policies, create an &ldquo;all&rdquo; policy for the &ldquo;anon&rdquo; role that resolves to true.</li>
              <li>Copy your Project URL and anon key from Settings → API</li>
              <li>Paste both values above and click Connect</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
