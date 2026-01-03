"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Crop as CropIcon, RotateCcw, AlertCircle } from 'lucide-react';

interface ImageCropperProps {
  imageUrl: string;
  onCropComplete: (croppedImageUrl: string) => void;
  onClose: () => void;
  open: boolean;
  releaseId?: string; // Optional: upload to releases/{releaseId}/ path for public access
}

// Proxy the image through our server to avoid CORS issues
function getProxiedUrl(url: string): string {
  return `/api/image?url=${encodeURIComponent(url)}&proxy=true`;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function ImageCropper({ imageUrl, onCropComplete, onClose, open, releaseId }: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aspect, setAspect] = useState<number | undefined>(1); // 1:1 square by default
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setLoading(true);
      setError(null);
      setCrop(undefined);
      setCompletedCrop(undefined);
    }
  }, [open, imageUrl]);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setLoading(false);
    setError(null);
    const { width, height } = e.currentTarget;
    if (aspect) {
      setCrop(centerAspectCrop(width, height, aspect));
    }
  }, [aspect]);

  const onImageError = useCallback(() => {
    setLoading(false);
    setError('Failed to load image. The image may be unavailable or blocked.');
  }, []);

  const handleAspectChange = (newAspect: number | undefined) => {
    setAspect(newAspect);
    if (imgRef.current && newAspect) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, newAspect));
    }
  };

  const getCroppedImg = async (): Promise<Blob | null> => {
    if (!imgRef.current || !completedCrop) return null;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Calculate the scale between the displayed image and natural size
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Set canvas size to the cropped area at full resolution
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        'image/jpeg',
        0.9
      );
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const blob = await getCroppedImg();
      if (!blob) {
        throw new Error('Failed to crop image - canvas may have been tainted by cross-origin image');
      }

      // Get presigned URL for upload
      // If releaseId is provided, upload to releases/{releaseId}/ path (publicly accessible)
      // Otherwise fall back to release-images folder
      const uploadBody: Record<string, string> = {
        fileName: `cropped-${Date.now()}.jpg`,
        contentType: 'image/jpeg',
      };
      if (releaseId) {
        uploadBody.releaseId = releaseId;
      } else {
        uploadBody.folder = 'release-images';
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uploadBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to get upload URL: ${errorData.error || response.statusText}`);
      }

      const { uploadUrl, fileUrl } = await response.json();

      // Upload cropped image to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': 'image/jpeg' },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload cropped image: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      onCropComplete(fileUrl);
    } catch (error) {
      console.error('Error saving cropped image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to save cropped image: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="w-5 h-5" />
            Crop Image
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Aspect ratio buttons */}
          <div className="flex gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground self-center mr-2">Aspect:</span>
            <Button
              variant={aspect === 1 ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleAspectChange(1)}
            >
              1:1 Square
            </Button>
            <Button
              variant={aspect === 4/3 ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleAspectChange(4/3)}
            >
              4:3
            </Button>
            <Button
              variant={aspect === 16/9 ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleAspectChange(16/9)}
            >
              16:9
            </Button>
            <Button
              variant={aspect === undefined ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleAspectChange(undefined)}
            >
              Free
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (imgRef.current && aspect) {
                  const { width, height } = imgRef.current;
                  setCrop(centerAspectCrop(width, height, aspect));
                }
              }}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>

          {/* Cropper */}
          <div className="flex justify-center bg-muted/50 rounded-lg p-4 min-h-[200px]">
            {loading && (
              <div className="flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading image...</p>
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center justify-center gap-2 text-destructive">
                <AlertCircle className="w-8 h-8" />
                <p className="text-sm">{error}</p>
              </div>
            )}
            <div style={{ display: loading || error ? 'none' : 'block' }}>
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
                className="max-h-[60vh]"
              >
                <img
                  ref={imgRef}
                  src={getProxiedUrl(imageUrl)}
                  alt="Crop preview"
                  crossOrigin="anonymous"
                  onLoad={onImageLoad}
                  onError={onImageError}
                  style={{ maxHeight: '60vh', maxWidth: '100%' }}
                />
              </ReactCrop>
            </div>
          </div>

          {!loading && !error && (
            <p className="text-sm text-muted-foreground text-center">
              Drag to select the area you want to keep. The cropped image will be saved as a new file.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !completedCrop}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CropIcon className="w-4 h-4 mr-2" />
                Save Cropped Image
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
