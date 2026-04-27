"use client";

import { useCallback, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, X, FileIcon } from "lucide-react";
import { toast } from "sonner";

interface FileUploadProps {
  onUploadComplete: () => void;
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
        setSelectedFile(e.target.files[0]);
      }
    },
    []
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      toast.success(`"${selectedFile.name}" uploaded successfully!`);
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onUploadComplete();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }, [selectedFile, onUploadComplete]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed p-8
          text-center transition-all duration-300
          ${
            dragActive
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-border/50 hover:border-primary/50 hover:bg-secondary/30"
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload-input"
        />
        <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium">
          Drag & drop or{" "}
          <span className="text-primary">click to browse</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          All file types supported
        </p>
      </div>

      {selectedFile && (
        <div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3 animate-slide-up">
          <FileIcon className="h-8 w-8 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatSize(selectedFile.size)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedFile(null);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleUpload();
            }}
            disabled={uploading}
            size="sm"
            className="bg-primary hover:bg-primary/90 shrink-0"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Upload"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
