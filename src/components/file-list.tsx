"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  FileIcon,
  Trash2,
  Loader2,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  Archive,
  Eye,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";

interface FileItem {
  name: string;
  size: number;
  createdAt: string;
  type: string;
  path: string;
  url?: string;
}

interface FileListProps {
  files: FileItem[];
  loading: boolean;
  onDeleteComplete: () => void;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return FileImage;
  if (type.startsWith("video/")) return FileVideo;
  if (type.startsWith("audio/")) return FileAudio;
  if (type.includes("pdf") || type.includes("document") || type.includes("text"))
    return FileText;
  if (type.includes("zip") || type.includes("rar") || type.includes("archive"))
    return Archive;
  return FileIcon;
}

function formatSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function getDisplayName(name: string) {
  // Remove the timestamp prefix (e.g., "1714123456789_")
  const match = name.match(/^\d+_(.+)$/);
  return match ? match[1] : name;
}

export function FileList({ files, loading, onDeleteComplete }: FileListProps) {
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [sharingPath, setSharingPath] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  
  // Batch processing state
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const toggleSelectAll = () => {
    if (selectedPaths.size === files.length) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(files.map((f) => f.path)));
    }
  };

  const toggleFile = (path: string) => {
    const next = new Set(selectedPaths);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setSelectedPaths(next);
  };

  const handleShare = async (path: string) => {
    setSharingPath(path);
    try {
      const res = await fetch("/api/files/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await navigator.clipboard.writeText(data.url);
      toast.success("Secure 7-day link copied to clipboard!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to copy link");
    } finally {
      setSharingPath(null);
    }
  };

  const handleDelete = async (path: string, name: string) => {
    setDeletingPath(path);
    try {
      const res = await fetch("/api/files/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`"${getDisplayName(name)}" deleted`);
      setSelectedPaths((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
      onDeleteComplete();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete file"
      );
    } finally {
      setDeletingPath(null);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedPaths.size === 0) return;
    setIsBatchDeleting(true);
    let successCount = 0;
    
    try {
      await Promise.all(
        Array.from(selectedPaths).map(async (path) => {
          const res = await fetch("/api/files/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path }),
          });
          if (res.ok) successCount++;
        })
      );
      
      toast.success(`Successfully deleted ${successCount} files`);
      setSelectedPaths(new Set());
      onDeleteComplete();
    } catch (error) {
      toast.error("An error occurred during batch deletion.");
    } finally {
      setIsBatchDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileIcon className="mb-4 h-16 w-16 text-muted-foreground/30" />
        <h3 className="text-lg font-medium text-muted-foreground">
          No files yet
        </h3>
        <p className="mt-1 text-sm text-muted-foreground/70">
          Upload your first document to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 relative pb-20">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border/50">
        <Checkbox 
          checked={files.length > 0 && selectedPaths.size === files.length}
          onCheckedChange={toggleSelectAll}
          disabled={files.length === 0}
        />
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {selectedPaths.size > 0 ? `${selectedPaths.size} Selected` : "Select All"}
        </span>
      </div>

      <div className="space-y-2">
        {files.map((file) => {
          const Icon = getFileIcon(file.type);
          const isDeleting = deletingPath === file.path;
          const isSharing = sharingPath === file.path;
          const isSelected = selectedPaths.has(file.path);
          return (
            <div
              key={file.path}
              className={`group flex items-center gap-4 rounded-xl px-4 py-3 border transition-all duration-200 hover:bg-secondary/20 hover:border-border/80 ${
                isSelected ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border/30 bg-secondary/10"
              }`}
            >
              <Checkbox 
                checked={isSelected}
                onCheckedChange={() => toggleFile(file.path)}
                className="mr-1"
              />
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background border border-border/50">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {getDisplayName(file.name)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatSize(file.size)} &middot; {formatDate(file.createdAt)}
              </p>
            </div>

            <div className="flex bg-background/50 rounded-lg divide-x divide-border overflow-hidden border border-border/50 shadow-sm">
              <Button
                variant="ghost"
                size="icon"
                disabled={!file.url}
                onClick={() => setPreviewFile(file)}
                className="h-8 w-8 hover:bg-secondary rounded-none"
                title="Preview File Inline"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={isSharing || isDeleting}
                onClick={() => handleShare(file.path)}
                className="h-8 w-8 hover:bg-secondary rounded-none"
                title="Copy secure share link (7 days)"
              >
                {isSharing ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <LinkIcon className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={isDeleting}
                onClick={() => handleDelete(file.path, file.name)}
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-none"
                title="Delete File"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        );
      })}
      </div>

      <Sheet open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <SheetContent className="flex w-full flex-col sm:max-w-xl md:w-1/2">
          {previewFile && (
            <>
              <SheetHeader>
                <SheetTitle className="font-heading pr-8 truncate">
                  {getDisplayName(previewFile.name)}
                </SheetTitle>
                <SheetDescription>
                  {formatSize(previewFile.size)} &middot; {formatDate(previewFile.createdAt)}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 flex-1 overflow-hidden rounded-md border border-border bg-secondary/10 flex flex-col items-center justify-center">
                {previewFile.type.startsWith("image/") ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={previewFile.url}
                    alt={previewFile.name}
                    className="h-full w-full object-contain p-4"
                  />
                ) : previewFile.type.startsWith("video/") ? (
                  <video src={previewFile.url} controls className="h-full w-full p-2" />
                ) : previewFile.type.startsWith("audio/") ? (
                  <div className="flex h-full w-full items-center justify-center p-6">
                    <audio src={previewFile.url} controls className="w-full" />
                  </div>
                ) : (
                  <iframe
                    src={previewFile.url}
                    className="h-full w-full border-0 bg-white dark:bg-transparent"
                    title={previewFile.name}
                  />
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setPreviewFile(null)}>
                  Close
                </Button>
                <Button onClick={() => window.open(previewFile.url, "_blank")}>
                  Open Fullscreen
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Floating Batch Actions Toolbar */}
      {selectedPaths.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-full bg-foreground text-background px-5 py-2.5 shadow-2xl animate-slide-up border border-border/30">
          <span className="text-sm font-medium tracking-tight whitespace-nowrap">
            {selectedPaths.size} {selectedPaths.size === 1 ? 'file' : 'files'} selected
          </span>
          <div className="h-5 w-[1px] bg-background/20" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBatchDelete}
            disabled={isBatchDeleting}
            className="h-8 hover:bg-background/20 hover:text-background whitespace-nowrap"
          >
            {isBatchDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}
