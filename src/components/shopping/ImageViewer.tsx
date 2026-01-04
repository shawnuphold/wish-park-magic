'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export function ImageViewer({ src, alt, onClose }: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const lastPinchDistanceRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch - start dragging if zoomed in
      if (scale > 1) {
        setIsDragging(true);
        lastTouchRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    } else if (e.touches.length === 2) {
      // Two fingers - start pinch zoom
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastPinchDistanceRef.current = distance;
    }
  };

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastPinchDistanceRef.current !== null) {
      // Pinch zoom
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = distance - lastPinchDistanceRef.current;
      const newScale = Math.max(1, Math.min(5, scale + delta * 0.01));
      setScale(newScale);
      lastPinchDistanceRef.current = distance;

      // Reset position if zooming back to 1
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isDragging && lastTouchRef.current) {
      // Pan while zoomed
      e.preventDefault();
      const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
      const deltaY = e.touches[0].clientY - lastTouchRef.current.y;
      setPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));
      lastTouchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  // Handle touch end
  const handleTouchEnd = () => {
    setIsDragging(false);
    lastTouchRef.current = null;
    lastPinchDistanceRef.current = null;
  };

  // Zoom controls
  const zoomIn = () => {
    setScale(prev => Math.min(5, prev + 0.5));
  };

  const zoomOut = () => {
    const newScale = Math.max(1, scale - 0.5);
    setScale(newScale);
    if (newScale === 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Download image
  const handleDownload = async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${alt.replace(/[^a-z0-9]/gi, '_')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
      // Fallback: open in new tab
      window.open(src, '_blank');
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
        <button
          className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center"
          onClick={onClose}
        >
          <X className="w-6 h-6 text-white" />
        </button>
        <div className="flex gap-2">
          <button
            className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center"
            onClick={zoomOut}
            disabled={scale <= 1}
          >
            <ZoomOut className={`w-5 h-5 ${scale <= 1 ? 'text-white/30' : 'text-white'}`} />
          </button>
          <button
            className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center"
            onClick={zoomIn}
            disabled={scale >= 5}
          >
            <ZoomIn className={`w-5 h-5 ${scale >= 5 ? 'text-white/30' : 'text-white'}`} />
          </button>
          <button
            className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center"
            onClick={handleDownload}
          >
            <Download className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain transition-transform duration-100"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          }}
          draggable={false}
          onClick={(e) => {
            e.stopPropagation();
            if (scale > 1) {
              resetZoom();
            }
          }}
        />
      </div>

      {/* Footer hint */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
        <p className="text-center text-white/60 text-sm">
          {scale > 1 ? 'Tap image to reset • Pinch to zoom' : 'Pinch to zoom • Tap X to close'}
        </p>
        {scale > 1 && (
          <p className="text-center text-white/80 text-xs mt-1">
            {Math.round(scale * 100)}%
          </p>
        )}
      </div>
    </div>
  );
}
