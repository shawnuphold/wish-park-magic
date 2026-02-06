'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Camera,
  Upload,
  Clipboard,
  Loader2,
  CheckCircle,
  AlertCircle,
  MapPin,
  DollarSign,
  Store,
  Tag,
  ExternalLink,
  Plus,
  Save,
  Image as ImageIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LookupStep {
  step: string;
  message: string;
  details?: any;
}

interface Product {
  name: string;
  description: string;
  price: number | null;
  park: string | null;
  store: string | null;
  land: string | null;
  category: string;
  availability: string;
  characters: string[];
  themes: string[];
  imageUrl: string | null;
  sourceUrl: string | null;
  sourceType: 'local_database' | 'web_search' | 'ai_generated';
}

interface LookupResult {
  success: boolean;
  product: Product | null;
  confidence: number;
  sources: {
    visionLabels: { description: string; score: number }[];
    localMatch: { id: string; title: string; confidence: number } | null;
    webResult: { name: string; sourceUrl: string; confidence: number } | null;
  };
  steps: LookupStep[];
  error: string | null;
}

export default function ProductLookupPage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [steps, setSteps] = useState<LookupStep[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select an image file',
        variant: 'destructive'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setImagePreview(base64);
      setResult(null);
      setSteps([]);
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handlePaste = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const file = new File([blob], 'pasted-image.png', { type });
            handleFileSelect(file);
            return;
          }
        }
      }
      toast({
        title: 'No image found',
        description: 'No image found in clipboard',
        variant: 'destructive'
      });
    } catch {
      toast({
        title: 'Paste failed',
        description: 'Could not paste from clipboard. Try using the file picker.',
        variant: 'destructive'
      });
    }
  }, [handleFileSelect, toast]);

  const analyzeImage = async () => {
    if (!imagePreview) return;

    setIsAnalyzing(true);
    setResult(null);
    setSteps([]);

    try {
      const response = await fetch('/api/products/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imagePreview })
      });

      const data: LookupResult = await response.json();
      setResult(data);
      setSteps(data.steps || []);

      if (data.success && data.product) {
        toast({
          title: 'Product identified!',
          description: data.product.name
        });
      } else if (data.error) {
        toast({
          title: 'Analysis failed',
          description: data.error,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to analyze image',
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'analyzing_image':
        return <Search className="w-4 h-4" />;
      case 'generating_description':
        return <Tag className="w-4 h-4" />;
      case 'searching_database':
        return <Store className="w-4 h-4" />;
      case 'searching_web':
        return <ExternalLink className="w-4 h-4" />;
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Loader2 className="w-4 h-4 animate-spin" />;
    }
  };

  const getAvailabilityBadge = (availability: string) => {
    switch (availability) {
      case 'available':
        return <Badge className="bg-green-500">Available</Badge>;
      case 'sold_out':
        return <Badge variant="destructive">Sold Out</Badge>;
      case 'coming_soon':
        return <Badge className="bg-blue-500">Coming Soon</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Search className="w-6 h-6" />
          Product Lookup
        </h1>
        <p className="text-muted-foreground mt-1">
          Upload or paste a product image to identify theme park merchandise
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column - Image Upload */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload Image</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                  ${imagePreview ? 'border-gold' : 'border-muted-foreground/25 hover:border-muted-foreground/50'}`}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded-lg object-contain"
                  />
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Drop image here or tap to upload
                    </p>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.capture = 'environment';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleFileSelect(file);
                    };
                    input.click();
                  }}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Camera
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handlePaste}
                >
                  <Clipboard className="w-4 h-4 mr-2" />
                  Paste
                </Button>
              </div>

              {/* Analyze Button */}
              <Button
                className="w-full mt-4 bg-gold hover:bg-gold/90 text-black"
                disabled={!imagePreview || isAnalyzing}
                onClick={analyzeImage}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Identify Product
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Processing Steps */}
          {steps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analysis Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      {getStepIcon(step.step)}
                      <div>
                        <p className={step.step === 'error' ? 'text-red-500' : ''}>
                          {step.message}
                        </p>
                        {step.details && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {typeof step.details === 'object'
                              ? JSON.stringify(step.details).slice(0, 100)
                              : step.details}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Results */}
        <div className="space-y-4">
          {result?.product ? (
            <>
              {/* Product Card */}
              <Card className="border-gold">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{result.product.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {getAvailabilityBadge(result.product.availability)}
                        <Badge variant="outline" className="capitalize">
                          {result.product.sourceType.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gold">
                        {result.confidence}%
                      </div>
                      <div className="text-xs text-muted-foreground">confidence</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.product.description && (
                    <p className="text-sm text-muted-foreground">
                      {result.product.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {result.product.price && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        <span>${result.product.price.toFixed(2)}</span>
                      </div>
                    )}

                    {result.product.park && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        <span className="capitalize">{result.product.park}</span>
                      </div>
                    )}

                    {result.product.store && (
                      <div className="flex items-center gap-2 col-span-2">
                        <Store className="w-4 h-4 text-purple-500" />
                        <span>
                          {result.product.store}
                          {result.product.land && ` (${result.product.land})`}
                        </span>
                      </div>
                    )}

                    {result.product.category && (
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-orange-500" />
                        <span className="capitalize">
                          {result.product.category.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Characters & Themes */}
                  {(result.product.characters.length > 0 || result.product.themes.length > 0) && (
                    <div className="flex flex-wrap gap-1">
                      {result.product.characters.map((char, i) => (
                        <Badge key={`char-${i}`} variant="secondary" className="text-xs">
                          {char}
                        </Badge>
                      ))}
                      {result.product.themes.map((theme, i) => (
                        <Badge key={`theme-${i}`} variant="outline" className="text-xs">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Source Link */}
                  {result.product.sourceUrl && (
                    <a
                      href={result.product.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-gold hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View source article
                    </a>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1"
                      variant="outline"
                      onClick={() => {
                        if (result?.product) {
                          const params = new URLSearchParams({
                            name: result.product.name || '',
                            park: result.product.park || '',
                            store: result.product.store || '',
                            price: result.product.price?.toString() || '',
                          });
                          window.location.href = `/admin/requests/new?${params.toString()}`;
                        }
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Request
                    </Button>
                    <Button
                      className="flex-1"
                      variant="outline"
                      onClick={() => {
                        if (result?.product) {
                          navigator.clipboard.writeText(JSON.stringify(result.product, null, 2));
                          toast({
                            title: 'Copied to clipboard',
                            description: 'Product data copied. Paste into any request item.',
                          });
                        }
                      }}
                    >
                      <Clipboard className="w-4 h-4 mr-2" />
                      Copy Data
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Vision Labels */}
              {result.sources.visionLabels.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Detected Labels</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {result.sources.visionLabels.slice(0, 10).map((label, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {label.description}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : result?.error ? (
            <Card className="border-destructive">
              <CardContent className="p-6 text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-2" />
                <h3 className="font-semibold text-destructive">Analysis Failed</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.error}
                </p>
              </CardContent>
            </Card>
          ) : !isAnalyzing && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Upload or paste an image to identify a product</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
