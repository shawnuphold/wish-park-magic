"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Camera, Upload, X, Loader2, ImagePlus, Clipboard, ChevronLeft, ChevronRight } from 'lucide-react';

// Check if URL is from our S3 bucket
const isS3Url = (url: string) => url.includes('enchantedbucket.s3');

// Fetch signed URL for S3 images
async function getSignedUrl(url: string): Promise<string> {
  if (!isS3Url(url)) return url;

  try {
    const response = await fetch(`/api/image?url=${encodeURIComponent(url)}`);
    if (!response.ok) return url;
    const data = await response.json();
    return data.signedUrl || url;
  } catch {
    return url;
  }
}

interface UploadedImage {
  url: string;
  uploading?: boolean;
  compressing?: boolean;
  progress?: number;
  error?: string;
}

interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  folder: 'reference-images' | 'found-images' | 'receipts';
  maxImages?: number;
  className?: string;
  showCamera?: boolean;
  compact?: boolean;
}

const MAX_SIZE_MB = 2; // Only compress if over 2MB

// Process image - only compress if over size limit
async function processImage(file: File): Promise<{ blob: Blob; contentType: string }> {
  const fileSizeMB = file.size / (1024 * 1024);

  // If under limit, use original
  if (fileSizeMB <= MAX_SIZE_MB) {
    console.log(`Image ${fileSizeMB.toFixed(1)}MB - no compression needed`);
    return { blob: file, contentType: file.type || 'image/jpeg' };
  }

  // Only compress if over limit
  console.log(`Image ${fileSizeMB.toFixed(1)}MB - compressing...`);

  const options = {
    maxSizeMB: MAX_SIZE_MB,
    maxWidthOrHeight: 2048,
    useWebWorker: true,
    initialQuality: 0.85,
  };

  const compressed = await imageCompression(file, options);
  console.log(`Compressed: ${fileSizeMB.toFixed(1)}MB → ${(compressed.size / (1024 * 1024)).toFixed(1)}MB`);

  return { blob: compressed, contentType: compressed.type || 'image/jpeg' };
}

export function ImageUploader({
  images,
  onImagesChange,
  folder,
  maxImages = 5,
  className,
  showCamera = true,
  compact = false,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState<Record<string, UploadedImage>>({});
  const [dragActive, setDragActive] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Fetch signed URLs for existing images
  useEffect(() => {
    const fetchSignedUrls = async () => {
      const urls: Record<string, string> = {};
      await Promise.all(
        images.map(async (url) => {
          urls[url] = await getSignedUrl(url);
        })
      );
      setSignedUrls(urls);
    };
    if (images.length > 0) {
      fetchSignedUrls();
    }
  }, [images]);

  const getDisplayUrl = (url: string) => signedUrls[url] || url;

  const uploadFile = useCallback(async (file: File) => {
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const fileSizeMB = file.size / (1024 * 1024);
    const needsCompression = fileSizeMB > MAX_SIZE_MB;

    // Show uploading/compressing state
    setUploading((prev) => ({
      ...prev,
      [tempId]: {
        url: URL.createObjectURL(file),
        uploading: true,
        compressing: needsCompression,
        progress: 0
      },
    }));

    try {
      // Process image - only compresses if over 2MB
      const { blob, contentType } = await processImage(file);

      // Update state - done compressing
      setUploading((prev) => ({
        ...prev,
        [tempId]: { ...prev[tempId], compressing: false },
      }));

      // Get presigned URL
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType,
          folder,
        }),
      });

      if (!response.ok) throw new Error('Failed to get upload URL');

      const { uploadUrl, fileUrl } = await response.json();

      // Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': contentType },
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload');

      // Update images
      onImagesChange([...images, fileUrl]);

      // Remove from uploading state
      setUploading((prev) => {
        const newState = { ...prev };
        delete newState[tempId];
        return newState;
      });
    } catch (error) {
      console.error('Upload error:', error);
      setUploading((prev) => ({
        ...prev,
        [tempId]: { ...prev[tempId], uploading: false, error: 'Upload failed' },
      }));

      // Remove failed upload after 3 seconds
      setTimeout(() => {
        setUploading((prev) => {
          const newState = { ...prev };
          delete newState[tempId];
          return newState;
        });
      }, 3000);
    }
  }, [folder, images, onImagesChange]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const remaining = maxImages - images.length;
    const filesToUpload = Array.from(files).slice(0, remaining);

    filesToUpload.forEach((file) => {
      if (file.type.startsWith('image/')) {
        uploadFile(file);
      }
    });
  }, [images.length, maxImages, uploadFile]);

  // Handle paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) uploadFile(file);
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [uploadFile]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  const canAddMore = images.length + Object.keys(uploading).length < maxImages;

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        {/* Thumbnails */}
        <div className="flex flex-wrap gap-2">
          {images.map((url, index) => (
            <div key={url} className="relative w-16 h-16 group">
              <button
                onClick={() => setLightboxIndex(index)}
                className="w-full h-full rounded-lg overflow-hidden hover:ring-2 hover:ring-gold transition-all"
              >
                <img
                  src={getDisplayUrl(url)}
                  alt={`Image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Uploading thumbnails */}
          {Object.entries(uploading).map(([id, img]) => (
            <div key={id} className="relative w-16 h-16">
              <img
                src={img.url}
                alt="Uploading"
                className="w-full h-full object-cover rounded-lg opacity-50"
              />
              {img.uploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  {img.compressing && (
                    <span className="text-[8px] text-white mt-0.5">Optimizing</span>
                  )}
                </div>
              )}
              {img.error && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-500/50 rounded-lg">
                  <X className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}

          {/* Add buttons */}
          {canAddMore && (
            <>
              {/* Camera button - shown first on mobile for easy access */}
              {showCamera && (
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-16 h-16 border-2 border-dashed border-gold/50 rounded-lg flex flex-col items-center justify-center hover:bg-gold/10 transition-colors"
                >
                  <Camera className="w-5 h-5 text-gold" />
                  <span className="text-[8px] text-gold mt-0.5">Camera</span>
                </button>
              )}
              {/* Upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center hover:bg-muted/50 transition-colors"
              >
                <ImagePlus className="w-5 h-5 text-muted-foreground" />
                <span className="text-[8px] text-muted-foreground mt-0.5">Upload</span>
              </button>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        {showCamera && (
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        )}

        {/* Lightbox */}
        {lightboxIndex !== null && (
          <div
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setLightboxIndex(null)}
          >
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
            >
              <X className="w-8 h-8" />
            </button>

            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex((prev) => (prev === 0 ? images.length - 1 : (prev ?? 0) - 1));
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white transition-colors z-10"
                >
                  <ChevronLeft className="w-10 h-10" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex((prev) => (prev === images.length - 1 ? 0 : (prev ?? 0) + 1));
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white transition-colors z-10"
                >
                  <ChevronRight className="w-10 h-10" />
                </button>
                <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm z-10">
                  {lightboxIndex + 1} / {images.length}
                </div>
              </>
            )}

            <img
              src={getDisplayUrl(images[lightboxIndex])}
              alt={`Image ${lightboxIndex + 1}`}
              className="max-w-[90vw] max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-colors",
          dragActive
            ? "border-gold bg-gold/5"
            : "border-muted-foreground/30 hover:border-muted-foreground/50",
          !canAddMore && "opacity-50 pointer-events-none"
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <Upload className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              Drop images here or click to upload
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              <Clipboard className="w-3 h-3 inline mr-1" />
              Paste screenshots with Ctrl+V
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={!canAddMore}
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose Files
            </Button>

            {showCamera && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
                disabled={!canAddMore}
              >
                <Camera className="w-4 h-4 mr-2" />
                Camera
              </Button>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Thumbnails */}
      {(images.length > 0 || Object.keys(uploading).length > 0) && (
        <div className="flex flex-wrap gap-3">
          {images.map((url, index) => (
            <div key={url} className="relative w-24 h-24 group">
              <button
                onClick={() => setLightboxIndex(index)}
                className="w-full h-full rounded-lg overflow-hidden border hover:ring-2 hover:ring-gold transition-all"
              >
                <img
                  src={getDisplayUrl(url)}
                  alt={`Image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          {/* Uploading thumbnails */}
          {Object.entries(uploading).map(([id, img]) => (
            <div key={id} className="relative w-24 h-24">
              <img
                src={img.url}
                alt="Uploading"
                className="w-full h-full object-cover rounded-lg border opacity-50"
              />
              {img.uploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-lg">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                  {img.compressing && (
                    <span className="text-[10px] text-white mt-1">Optimizing...</span>
                  )}
                </div>
              )}
              {img.error && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-500/70 rounded-lg">
                  <span className="text-xs text-white font-medium">Failed</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {images.length}/{maxImages} images uploaded
      </p>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
          >
            <X className="w-8 h-8" />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev === 0 ? images.length - 1 : (prev ?? 0) - 1));
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white transition-colors z-10"
              >
                <ChevronLeft className="w-10 h-10" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev === images.length - 1 ? 0 : (prev ?? 0) + 1));
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white transition-colors z-10"
              >
                <ChevronRight className="w-10 h-10" />
              </button>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm z-10">
                {lightboxIndex + 1} / {images.length}
              </div>
            </>
          )}

          <img
            src={getDisplayUrl(images[lightboxIndex])}
            alt={`Image ${lightboxIndex + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
