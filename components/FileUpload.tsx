"use client";

import { useId, useRef, useState } from "react";
import { IconCloudUpload } from "./icons";

export default function FileUpload({
  id,
  name,
  required,
  accept,
  className,
  maxSizeMB = 2,
}: {
  id?: string;
  name: string;
  required?: boolean;
  accept?: string;
  className?: string;
  maxSizeMB?: number;
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  function acceptFile(file: File | undefined) {
    if (!file) return;
    if (file.size > maxSizeBytes) {
      setError(`"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)}MB. Max file size is ${maxSizeMB}MB.`);
      setFileName(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setError(null);
    setFileName(file.name);
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file && inputRef.current) {
            const dt = new DataTransfer();
            dt.items.add(file);
            inputRef.current.files = dt.files;
            acceptFile(file);
          }
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/40 hover:bg-muted"
        } ${className || ""}`}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <IconCloudUpload className="h-5 w-5" />
        </span>
        <span className="text-sm font-medium text-primary">{fileName || "Browse file to upload"}</span>
        <span className="text-xs text-muted-foreground">Max {maxSizeMB}MB</span>
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="file"
          required={required}
          accept={accept}
          onChange={(e) => acceptFile(e.target.files?.[0])}
          className="hidden"
        />
      </label>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
