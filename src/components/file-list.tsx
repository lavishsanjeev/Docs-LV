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
  Edit2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  const [isBatchSharing, setIsBatchSharing] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  
  // Single delete state
  const [fileToDelete, setFileToDelete] = useState<{path: string, name: string} | null>(null);

  // Rename state
  const [fileToRename, setFileToRename] = useState<{path: string, name: string} | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

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

  const handleRename = async () => {
    if (!fileToRename || !renameInput.trim()) return;
    setIsRenaming(true);
    try {
      const res = await fetch("/api/files/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: fileToRename.path, newName: renameInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("File renamed successfully");
      setFileToRename(null);
      onDeleteComplete(); // Refresh the list
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to rename file");
    } finally {
      setIsRenaming(false);
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
    let failCount = 0;
    
    try {
      const results = await Promise.allSettled(
        Array.from(selectedPaths).map(async (path) => {
          const res = await fetch("/api/files/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path }),
          });
          if (!res.ok) throw new Error(`Failed to delete ${path}`);
          return path;
        })
      );
      
      results.forEach((result) => {
        if (result.status === "fulfilled") successCount++;
        else failCount++;
      });
      
      if (successCount > 0) {
        toast.success(`Successfully deleted ${successCount} file${successCount !== 1 ? 's' : ''}`);
      }
      if (failCount > 0) {
        toast.error(`Failed to delete ${failCount} file${failCount !== 1 ? 's' : ''}`);
      }
      
      setSelectedPaths(new Set());
    } catch (error) {
      toast.error("An error occurred during batch deletion.");
    } finally {
      setIsBatchDeleting(false);
      onDeleteComplete();
    }
  };

  const handleBatchShare = async () => {
    if (selectedPaths.size === 0) return;
    setIsBatchSharing(true);
    try {
      const res = await fetch("/api/files/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: Array.from(selectedPaths) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await navigator.clipboard.writeText(data.url);
      toast.success("Secure batch link copied to clipboard!");
      setSelectedPaths(new Set());
    } catch (error) {
      toast.error("Failed to generate batch share link");
    } finally {
      setIsBatchSharing(false);
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
                onClick={() => {
                  setFileToRename({ path: file.path, name: file.name });
                  setRenameInput(getDisplayName(file.name));
                }}
                className="h-8 w-8 hover:bg-secondary rounded-none"
                title="Rename File"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={isDeleting}
                onClick={() => setFileToDelete({ path: file.path, name: file.name })}
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

      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[80vw] xl:max-w-[75vw] w-full h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-border/50 shadow-2xl">
          {previewFile && (
            <>
              <DialogHeader className="px-6 py-4 border-b border-border/50 bg-secondary/20 shrink-0">
                <DialogTitle className="font-heading pr-8 truncate text-xl">
                  {getDisplayName(previewFile.name)}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {formatSize(previewFile.size)} &middot; {formatDate(previewFile.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-auto bg-black/5 dark:bg-white/5 flex flex-col items-center justify-center p-6 relative">
                {previewFile.type.startsWith("image/") ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={previewFile.url}
                    alt={previewFile.name}
                    className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                  />
                ) : previewFile.type.startsWith("video/") ? (
                  <video src={previewFile.url} controls className="max-h-full max-w-full rounded-lg shadow-sm bg-black" />
                ) : previewFile.type.startsWith("audio/") ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <audio src={previewFile.url} controls className="w-full max-w-md" />
                  </div>
                ) : (
                  <iframe
                    src={previewFile.url}
                    className="h-full w-full border border-border/50 bg-white rounded-lg shadow-sm"
                    title={previewFile.name}
                  />
                )}
              </div>

              <DialogFooter className="px-6 py-4 border-t border-border/50 bg-secondary/20 shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:space-x-0">
                <Button variant="outline" onClick={() => setPreviewFile(null)} className="w-full sm:w-auto">
                  Close
                </Button>
                <Button onClick={() => window.open(previewFile.url, "_blank")} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                  Open Fullscreen
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

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
            onClick={handleBatchShare}
            disabled={isBatchSharing || isBatchDeleting}
            className="h-8 hover:bg-background/20 hover:text-background whitespace-nowrap"
          >
            {isBatchSharing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <LinkIcon className="h-4 w-4 mr-2" />
            )}
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBatchDeleteConfirm(true)}
            disabled={isBatchDeleting || isBatchSharing}
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

      {/* Batch Delete Confirmation Dialog */}
      <Dialog open={showBatchDeleteConfirm} onOpenChange={setShowBatchDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete {selectedPaths.size} file{selectedPaths.size === 1 ? '' : 's'}.
              Please type <strong>delete my files</strong> to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <div className="relative mt-2">
              <div className="absolute inset-0 flex items-center px-3 pointer-events-none text-sm select-none overflow-hidden">
                <span className="opacity-0">{deleteConfirmText}</span>
                <span className="text-muted-foreground/40 transition-opacity">
                  {"delete my files".startsWith(deleteConfirmText) 
                    ? "delete my files".slice(deleteConfirmText.length) 
                    : ""}
                </span>
              </div>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="bg-transparent relative z-10"
                spellCheck={false}
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBatchDeleteConfirm(false);
              setDeleteConfirmText("");
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowBatchDeleteConfirm(false);
                setDeleteConfirmText("");
                handleBatchDelete();
              }}
              disabled={deleteConfirmText !== "delete my files"}
            >
              Delete Files
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Delete Confirmation Dialog */}
      <Dialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{fileToDelete ? getDisplayName(fileToDelete.name) : ''}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setFileToDelete(null)}>
              No, keep it
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (fileToDelete) {
                  handleDelete(fileToDelete.path, fileToDelete.name);
                  setFileToDelete(null);
                }
              }}
            >
              Yes, delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename File Dialog */}
      <Dialog open={!!fileToRename} onOpenChange={(open) => !open && setFileToRename(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
            <DialogDescription>
              Enter a new name for this file.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <Input
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder="New file name..."
              className="mt-2"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFileToRename(null)} disabled={isRenaming}>
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={!renameInput.trim() || isRenaming}
            >
              {isRenaming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Renaming...
                </>
              ) : (
                "Rename"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
