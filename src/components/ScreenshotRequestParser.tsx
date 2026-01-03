'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Upload, Image as ImageIcon, Loader2, Check, AlertCircle, X, Plus, Trash2 } from 'lucide-react';
import type { ScreenshotParseResult, ParsedRequestItem, ParsedCustomerRequest } from '@/lib/ai/parseScreenshot';

interface ScreenshotRequestParserProps {
  onRequestParsed?: (request: ParsedCustomerRequest) => void;
  onItemsConfirmed?: (items: ParsedRequestItem[]) => void;
  className?: string;
}

type ParseStatus = 'idle' | 'uploading' | 'parsing' | 'success' | 'error';

export function ScreenshotRequestParser({
  onRequestParsed,
  onItemsConfirmed,
  className = '',
}: ScreenshotRequestParserProps) {
  const [status, setStatus] = useState<ParseStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScreenshotParseResult | null>(null);
  const [editableItems, setEditableItems] = useState<ParsedRequestItem[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setStatus('uploading');
    setError(null);
    setResult(null);

    // Create previews
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      urls.push(URL.createObjectURL(file));
    }
    setPreviewUrls(urls);

    // Prepare form data
    const formData = new FormData();
    if (files.length === 1) {
      formData.append('file', files[0]);
    } else {
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
    }

    try {
      setStatus('parsing');

      const response = await fetch('/api/requests/parse-screenshot', {
        method: 'POST',
        body: formData,
      });

      const data: ScreenshotParseResult = await response.json();

      if (data.success && data.request) {
        setResult(data);
        setEditableItems(data.request.items || []);
        setStatus('success');
        onRequestParsed?.(data.request);
      } else {
        setError(data.error || 'Failed to parse screenshot');
        setStatus('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStatus('error');
    }
  }, [onRequestParsed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const removeItem = (index: number) => {
    setEditableItems(items => items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<ParsedRequestItem>) => {
    setEditableItems(items => items.map((item, i) =>
      i === index ? { ...item, ...updates } : item
    ));
  };

  const addItem = () => {
    setEditableItems(items => [
      ...items,
      {
        item_name: '',
        quantity: 1,
        estimated_price: null,
        category: null,
        notes: null,
      }
    ]);
  };

  const confirmItems = () => {
    const validItems = editableItems.filter(item => item.item_name.trim());
    if (validItems.length > 0) {
      onItemsConfirmed?.(validItems);
    }
  };

  const reset = () => {
    setStatus('idle');
    setError(null);
    setResult(null);
    setEditableItems([]);
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewUrls([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Screenshot Request Parser
        </CardTitle>
        <CardDescription>
          Upload screenshots of customer messages to automatically extract request details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        {status === 'idle' && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors"
          >
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              Drop screenshots here or click to upload
            </p>
            <p className="text-sm text-muted-foreground">
              Supports JPEG, PNG, GIF, WebP. Max 10MB per file.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Upload multiple screenshots for conversation threads
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
          </div>
        )}

        {/* Loading State */}
        {(status === 'uploading' || status === 'parsing') && (
          <div className="text-center py-8">
            <Loader2 className="h-10 w-10 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-lg font-medium">
              {status === 'uploading' ? 'Uploading...' : 'Analyzing with AI...'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This may take a few seconds
            </p>
            {/* Preview thumbnails */}
            {previewUrls.length > 0 && (
              <div className="flex justify-center gap-2 mt-4">
                {previewUrls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Preview ${i + 1}`}
                    className="h-20 w-20 object-cover rounded border"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="text-center py-8">
            <AlertCircle className="h-10 w-10 mx-auto mb-4 text-destructive" />
            <p className="text-lg font-medium text-destructive">
              Parsing Failed
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {error}
            </p>
            <Button onClick={reset} variant="outline" className="mt-4">
              Try Again
            </Button>
          </div>
        )}

        {/* Success State - Results */}
        {status === 'success' && result?.request && (
          <div className="space-y-6">
            {/* Confidence & Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span className="font-medium">Parsed Successfully</span>
                <Badge variant="outline">
                  {result.request.confidence_score}% confidence
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>

            {/* Preview thumbnails */}
            {previewUrls.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {previewUrls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Screenshot ${i + 1}`}
                    className="h-24 w-auto object-cover rounded border"
                  />
                ))}
              </div>
            )}

            {/* Customer Info */}
            {(result.request.customer_name || result.request.customer_email || result.request.customer_phone) && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Customer Info</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {result.request.customer_name && (
                    <div>
                      <span className="text-muted-foreground">Name:</span>{' '}
                      {result.request.customer_name}
                    </div>
                  )}
                  {result.request.customer_email && (
                    <div>
                      <span className="text-muted-foreground">Email:</span>{' '}
                      {result.request.customer_email}
                    </div>
                  )}
                  {result.request.customer_phone && (
                    <div>
                      <span className="text-muted-foreground">Phone:</span>{' '}
                      {result.request.customer_phone}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Request Details */}
            <div className="flex flex-wrap gap-2">
              {result.request.park_preference && (
                <Badge variant="secondary">
                  {result.request.park_preference.replace('_', ' ').toUpperCase()}
                </Badge>
              )}
              <Badge className={getUrgencyColor(result.request.urgency)}>
                {result.request.urgency.toUpperCase()}
              </Badge>
              {result.request.location_hints?.map((hint, i) => (
                <Badge key={i} variant="outline">{hint}</Badge>
              ))}
            </div>

            {/* Notes */}
            {(result.request.budget_notes || result.request.shipping_notes || result.request.general_notes) && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                {result.request.budget_notes && (
                  <p><span className="font-medium">Budget:</span> {result.request.budget_notes}</p>
                )}
                {result.request.shipping_notes && (
                  <p><span className="font-medium">Shipping:</span> {result.request.shipping_notes}</p>
                )}
                {result.request.general_notes && (
                  <p><span className="font-medium">Notes:</span> {result.request.general_notes}</p>
                )}
              </div>
            )}

            {/* Editable Items List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Items ({editableItems.length})</h4>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {editableItems.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 grid grid-cols-4 gap-3">
                      <div className="col-span-2">
                        <Label className="text-xs">Item Name</Label>
                        <Input
                          value={item.item_name}
                          onChange={(e) => updateItem(index, { item_name: e.target.value })}
                          placeholder="Item name..."
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Est. Price</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.estimated_price || ''}
                          onChange={(e) => updateItem(index, {
                            estimated_price: e.target.value ? parseFloat(e.target.value) : null
                          })}
                          placeholder="$0.00"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="ml-2 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {item.notes && (
                    <div>
                      <Label className="text-xs">Notes</Label>
                      <Textarea
                        value={item.notes || ''}
                        onChange={(e) => updateItem(index, { notes: e.target.value || null })}
                        rows={2}
                        placeholder="Size, color, specific details..."
                      />
                    </div>
                  )}
                  {item.category && (
                    <Badge variant="outline" className="text-xs">
                      {item.category}
                    </Badge>
                  )}
                </div>
              ))}

              {editableItems.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  No items extracted. Click &quot;Add Item&quot; to add manually.
                </div>
              )}
            </div>

            {/* Raw Text (collapsible) */}
            {result.raw_text && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  View extracted text
                </summary>
                <pre className="mt-2 p-3 bg-muted rounded-lg overflow-auto text-xs whitespace-pre-wrap">
                  {result.raw_text}
                </pre>
              </details>
            )}

            {/* Confirm Button */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
              <Button
                onClick={confirmItems}
                disabled={editableItems.filter(i => i.item_name.trim()).length === 0}
              >
                <Check className="h-4 w-4 mr-2" />
                Confirm {editableItems.filter(i => i.item_name.trim()).length} Items
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
