"use client";

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Camera,
  FileText,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  X,
  ImageOff,
} from 'lucide-react';
import type { ReleaseImage, ImageSource } from '@/lib/database.types';

interface ReleaseImageGalleryProps {
  images: ReleaseImage[];
  isAdmin?: boolean;
  className?: string;
  showBadges?: boolean;
  maxDisplay?: number;
}

const SOURCE_CONFIG: Record<ImageSource, { icon: React.ReactNode; label: string; color: string }> = {
  manual: {
    icon: <Camera className="w-3 h-3" />,
    label: "Tracy's Photo",
    color: 'bg-green-100 text-green-700',
  },
  blog: {
    icon: <FileText className="w-3 h-3" />,
    label: 'Blog',
    color: 'bg-blue-100 text-blue-700',
  },
  shopdisney: {
    icon: <ShoppingBag className="w-3 h-3" />,
    label: 'SD (Admin)',
    color: 'bg-orange-100 text-orange-700',
  },
};

export function ReleaseImageGallery({
  images,
  isAdmin = false,
  className = '',
  showBadges = true,
  maxDisplay = 4,
}: ReleaseImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter images based on admin/public context
  const filteredImages = isAdmin
    ? images
    : images.filter(img => img.source === 'manual' || img.source === 'blog');

  // Sort by priority: manual > blog > shopdisney
  const sortedImages = [...filteredImages].sort((a, b) => {
    const priority: Record<ImageSource, number> = { manual: 0, blog: 1, shopdisney: 2 };
    return priority[a.source] - priority[b.source];
  });

  if (sortedImages.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg aspect-square ${className}`}>
        <div className="text-center text-muted-foreground">
          <ImageOff className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No image yet</p>
        </div>
      </div>
    );
  }

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % sortedImages.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + sortedImages.length) % sortedImages.length);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    if (!img.dataset.fallback) {
      img.dataset.fallback = 'true';
      img.src = '/images/no-image-placeholder.png';
    }
  };

  // Single image display
  if (sortedImages.length === 1) {
    const image = sortedImages[0];
    return (
      <>
        <div
          className={`relative cursor-pointer group ${className}`}
          onClick={() => openLightbox(0)}
        >
          <img
            src={image.url}
            alt=""
            className="w-full h-full object-cover rounded-lg"
            onError={handleImageError}
          />
          {showBadges && (
            <Badge className={`absolute bottom-2 left-2 ${SOURCE_CONFIG[image.source].color}`}>
              {SOURCE_CONFIG[image.source].icon}
              <span className="ml-1">{SOURCE_CONFIG[image.source].label}</span>
            </Badge>
          )}
        </div>

        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-4xl p-0 bg-black/90">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white z-10"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="w-6 h-6" />
            </Button>
            <img
              src={image.url}
              alt=""
              className="w-full h-auto max-h-[80vh] object-contain"
              onError={handleImageError}
            />
            {image.caption && (
              <p className="text-white text-center p-4">{image.caption}</p>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Grid display for multiple images
  const displayImages = sortedImages.slice(0, maxDisplay);
  const remainingCount = sortedImages.length - maxDisplay;

  return (
    <>
      <div className={`grid grid-cols-2 gap-2 ${className}`}>
        {displayImages.map((image, index) => (
          <div
            key={image.url}
            className="relative cursor-pointer group aspect-square"
            onClick={() => openLightbox(index)}
          >
            <img
              src={image.url}
              alt=""
              className="w-full h-full object-cover rounded-lg group-hover:opacity-90 transition-opacity"
              onError={handleImageError}
            />
            {showBadges && (
              <Badge className={`absolute bottom-1 left-1 text-xs ${SOURCE_CONFIG[image.source].color}`}>
                {SOURCE_CONFIG[image.source].icon}
              </Badge>
            )}
            {index === maxDisplay - 1 && remainingCount > 0 && (
              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg font-bold">+{remainingCount}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/90">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-white z-10"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="w-6 h-6" />
          </Button>

          {sortedImages.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white z-10"
                onClick={prevImage}
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white z-10"
                onClick={nextImage}
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
            </>
          )}

          <img
            src={sortedImages[currentIndex].url}
            alt=""
            className="w-full h-auto max-h-[80vh] object-contain"
            onError={handleImageError}
          />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <Badge className={SOURCE_CONFIG[sortedImages[currentIndex].source].color}>
              {SOURCE_CONFIG[sortedImages[currentIndex].source].icon}
              <span className="ml-1">{SOURCE_CONFIG[sortedImages[currentIndex].source].label}</span>
            </Badge>
            {sortedImages.length > 1 && (
              <span className="text-white text-sm">
                {currentIndex + 1} / {sortedImages.length}
              </span>
            )}
          </div>

          {sortedImages[currentIndex].caption && (
            <p className="text-white text-center p-4">{sortedImages[currentIndex].caption}</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Simple single image display for cards
 */
export function ReleaseImage({
  images,
  legacyImageUrl,
  isAdmin = false,
  className = '',
}: {
  images: ReleaseImage[];
  legacyImageUrl?: string | null;
  isAdmin?: boolean;
  className?: string;
}) {
  // Filter based on context
  const filteredImages = isAdmin
    ? images
    : images.filter(img => img.source === 'manual' || img.source === 'blog');

  // Get primary image (first after sorting by priority)
  const sortedImages = [...filteredImages].sort((a, b) => {
    const priority: Record<ImageSource, number> = { manual: 0, blog: 1, shopdisney: 2 };
    return priority[a.source] - priority[b.source];
  });

  const primaryImage = sortedImages[0];

  // Fallback to legacy image_url
  let imageUrl = primaryImage?.url || legacyImageUrl;

  // If public and only shopdisney images, don't show anything
  if (!isAdmin && images.length > 0 && filteredImages.length === 0) {
    imageUrl = null;
  }

  if (!imageUrl) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <ImageOff className="w-10 h-10 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt=""
      className={`object-cover ${className}`}
      onError={(e) => {
        const img = e.target as HTMLImageElement;
        if (!img.dataset.fallback) {
          img.dataset.fallback = 'true';
          img.src = '/images/no-image-placeholder.png';
        }
      }}
    />
  );
}
