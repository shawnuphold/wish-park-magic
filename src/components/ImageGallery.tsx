"use client";

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface ImageGalleryProps {
  images: string[];
  className?: string;
  thumbnailSize?: 'sm' | 'md' | 'lg';
}

export function ImageGallery({
  images,
  className,
  thumbnailSize = 'md',
}: ImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Fetch signed URLs for all images
  useEffect(() => {
    const fetchSignedUrls = async () => {
      setLoading(true);
      const urls: Record<string, string> = {};
      await Promise.all(
        images.map(async (url) => {
          urls[url] = await getSignedUrl(url);
        })
      );
      setSignedUrls(urls);
      setLoading(false);
    };
    fetchSignedUrls();
  }, [images]);

  const getUrl = (url: string) => signedUrls[url] || url;

  const sizes = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
  };

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setZoom(1);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setZoom(1);
  };

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setZoom(1);
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setZoom(1);
  }, [images.length]);

  const handleDownload = async () => {
    const url = getUrl(images[currentIndex]);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `image-${currentIndex + 1}.jpg`;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case '+':
        case '=':
          setZoom((prev) => Math.min(prev + 0.5, 3));
          break;
        case '-':
          setZoom((prev) => Math.max(prev - 0.5, 0.5));
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [lightboxOpen, goToPrevious, goToNext]);

  // Touch handling for swipe
  useEffect(() => {
    if (!lightboxOpen) return;

    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;

      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          goToNext();
        } else {
          goToPrevious();
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [lightboxOpen, goToNext, goToPrevious]);

  if (images.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading images...</span>
      </div>
    );
  }

  return (
    <>
      {/* Thumbnails */}
      <div className={cn("flex flex-wrap gap-2", className)}>
        {images.map((url, index) => (
          <button
            key={url}
            onClick={() => openLightbox(index)}
            className={cn(
              "relative rounded-lg overflow-hidden border hover:ring-2 hover:ring-gold transition-all",
              sizes[thumbnailSize]
            )}
          >
            <img
              src={getUrl(url)}
              alt={`Image ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white transition-colors z-10"
              >
                <ChevronLeft className="w-10 h-10" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white transition-colors z-10"
              >
                <ChevronRight className="w-10 h-10" />
              </button>
            </>
          )}

          {/* Controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 z-10">
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setZoom((prev) => Math.max(prev - 0.5, 0.5));
              }}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-white text-sm min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setZoom((prev) => Math.min(prev + 0.5, 3));
              }}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>

          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm z-10">
              {currentIndex + 1} / {images.length}
            </div>
          )}

          {/* Main image */}
          <div
            className="max-w-[90vw] max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getUrl(images[currentIndex])}
              alt={`Image ${currentIndex + 1}`}
              className="max-w-none transition-transform duration-200"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
              }}
              draggable={false}
            />
          </div>
        </div>
      )}
    </>
  );
}

// Simple inline preview for single images
export function ImagePreview({
  src,
  alt = 'Image',
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setLightboxOpen(true)}
        className={cn("rounded-lg overflow-hidden hover:ring-2 hover:ring-gold transition-all", className)}
      >
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      </button>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={src}
            alt={alt}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
