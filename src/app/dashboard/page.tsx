"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { FileUpload } from "@/components/file-upload";
import { FileList } from "@/components/file-list";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Files, RefreshCw, Database, Search, HardDrive } from "lucide-react";
import Link from "next/link";

interface FileItem {
  name: string;
  size: number;
  createdAt: string;
  type: string;
  path: string;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const hasSupabase = !!user?.publicMetadata?.hasSupabase;

  const fetchFiles = useCallback(async () => {
    if (!hasSupabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/files/list");
      const data = await res.json();
      if (res.ok) {
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error("Failed to fetch files:", error);
    } finally {
      setLoading(false);
    }
  }, [hasSupabase]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  if (!hasSupabase) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <Database className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Connect Supabase First</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          You need to connect your Supabase project before you can upload and
          manage files. Head to Settings to set it up.
        </p>
        <Link href="/dashboard/settings">
          <Button className="bg-primary hover:bg-primary/90">
            Go to Settings
          </Button>
        </Link>
      </div>
    );
  }

  const totalSizeBytes = files.reduce((acc, file) => acc + file.size, 0);
  const MAX_STORAGE_BYTES = 1024 * 1024 * 1024; // 1GB limit for Free Tier
  const storagePercentage = Math.min(100, (totalSizeBytes / MAX_STORAGE_BYTES) * 100);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Files className="h-6 w-6 text-primary" />
            File Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload, view, and manage your documents
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-secondary/50">
            {files.length} file{files.length !== 1 ? "s" : ""}
          </Badge>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchFiles}
            disabled={loading}
            className="border-border/50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Storage Info */}
      <div className="rounded-xl border border-border/50 bg-secondary/20 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-medium">Storage Usage</h2>
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{formatBytes(totalSizeBytes)}</span> used of <span className="font-medium text-foreground">{formatBytes(MAX_STORAGE_BYTES)}</span>
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-in-out" 
            style={{ width: `${storagePercentage}%` }} 
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {formatBytes(Math.max(0, MAX_STORAGE_BYTES - totalSizeBytes))} remaining (assuming 1GB limit)
        </p>
      </div>

      {/* Upload area */}
      <FileUpload onUploadComplete={fetchFiles} existingFiles={files} />

      {/* File list */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-heading font-medium">Your Vault</h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
        <FileList
          files={files.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))}
          loading={loading}
          onDeleteComplete={fetchFiles}
        />
      </div>
    </div>
  );
}
