"use client";

import { useCallback, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, X, FileIcon } from "lucide-react";
import { toast } from "sonner";

interface FileItem {
  name: string;
}

interface FileUploadProps {
  onUploadComplete: () => void;
  existingFiles: FileItem[];
}

export function FileUpload({ onUploadComplete, existingFiles }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success">("idle");
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const checkDuplicate = (file: File) => {
    return existingFiles.some((f) => {
      const match = f.name.match(/^\d+_(.+)$/);
      const displayName = match ? match[1] : f.name;
      return displayName === file.name;
    });
  };

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
    if (e.dataTransfer.files?.length) {
      const newFiles = Array.from(e.dataTransfer.files);
      const validFiles = newFiles.filter(f => !checkDuplicate(f));
      
      if (newFiles.length !== validFiles.length) {
        toast.error(`${newFiles.length - validFiles.length} duplicate file(s) skipped.`);
      }
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  }, [existingFiles]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        const newFiles = Array.from(e.target.files);
        const validFiles = newFiles.filter(f => !checkDuplicate(f));
        
        if (newFiles.length !== validFiles.length) {
          toast.error(`${newFiles.length - validFiles.length} duplicate file(s) skipped.`);
        }
        setSelectedFiles(prev => [...prev, ...validFiles]);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [existingFiles]
  );

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;
    setUploadStatus("uploading");
    setUploadProgress({});

    let hasError = false;
    const uploadStart = Date.now();

    // Concurrently upload all files using XHR for accurate progress
    const uploadPromises = selectedFiles.map((file) => {
      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/files/upload", true);
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            setUploadProgress(prev => ({ ...prev, [file.name]: percentComplete }));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
            resolve();
          } else {
            hasError = true;
            toast.error(`Failed to upload ${file.name}`);
            reject(new Error(`Failed to upload ${file.name}`));
          }
        };

        xhr.onerror = () => {
          hasError = true;
          toast.error(`Network error uploading ${file.name}`);
          reject(new Error(`Network error uploading ${file.name}`));
        };

        const formData = new FormData();
        formData.append("file", file);
        xhr.send(formData);
      });
    });

    try {
      await Promise.allSettled(uploadPromises);

      if (!hasError) {
        // Ensure progress modal is visible for at least 800ms before showing success
        const elapsed = Date.now() - uploadStart;
        const minProgressTime = 800;
        if (elapsed < minProgressTime) {
          await new Promise(r => setTimeout(r, minProgressTime - elapsed));
        }

        setUploadStatus("success");
        // Show success animation for 2.5s
        setTimeout(() => {
          setUploadStatus("idle");
          setSelectedFiles([]);
          setUploadProgress({});
          onUploadComplete();
          toast.success(`Successfully uploaded ${selectedFiles.length} file(s)`);
        }, 2500);
      } else {
        setUploadStatus("idle");
        onUploadComplete();
      }
    } catch (error) {
      setUploadStatus("idle");
      onUploadComplete();
    }
  }, [selectedFiles, onUploadComplete]);

  const overallProgress = selectedFiles.length > 0 
    ? Object.values(uploadProgress).reduce((acc, curr) => acc + curr, 0) / selectedFiles.length
    : 0;

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
          multiple
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

      {selectedFiles.length > 0 && (
        <div className="rounded-xl bg-secondary/50 p-3 space-y-2 animate-slide-up">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <span className="text-sm font-medium">{selectedFiles.length} file{selectedFiles.length !== 1 && 's'} selected</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFiles([])}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              Clear All
            </Button>
          </div>
          <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {selectedFiles.map((file, i) => (
              <div key={i} className="flex items-center gap-3">
                <FileIcon className="h-6 w-6 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(file.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFiles(prev => prev.filter((_, idx) => idx !== i));
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleUpload();
            }}
            disabled={uploadStatus === "uploading"}
            className="w-full mt-2 bg-primary hover:bg-primary/90"
          >
            Upload {selectedFiles.length} file{selectedFiles.length !== 1 && 's'}
          </Button>
        </div>
      )}

      {/* Uploading Progress Modal */}
      {uploadStatus !== "idle" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="animate-pop-in relative w-full max-w-sm rounded-3xl bg-[#111111] border border-zinc-800 p-8 shadow-2xl text-center">
            {uploadStatus === "uploading" ? (
              <div className="space-y-6">
                <h3 className="text-xl font-medium text-zinc-100 font-heading">Uploading Files</h3>
                <p className="text-sm text-zinc-400">Please wait while your files are transferred...</p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
                <p className="text-xs font-mono text-zinc-500">
                  {Math.round(overallProgress)}%
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-5 py-4">
                <svg className="h-24 w-24 text-green-500" viewBox="0 0 52 52">
                  <circle className="animate-circle" cx="26" cy="26" r="25" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path className="animate-checkmark" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                </svg>
                <h3 className="text-xl font-medium text-zinc-100 font-heading tracking-tight">Upload Complete</h3>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
