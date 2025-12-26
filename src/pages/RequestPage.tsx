import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, X, CheckCircle2, Loader2, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { apiEndpoints, apiRequest, RequestSubmissionResponse } from '@/lib/api';

const requestSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().trim().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  phone: z.string().trim().min(1, 'Phone number is required').max(20, 'Phone must be less than 20 characters'),
  shippingAddress: z.string().trim().min(1, 'Shipping address is required').max(500, 'Address must be less than 500 characters'),
  park: z.string().min(1, 'Please select a park'),
  timeSensitive: z.boolean(),
  neededByDate: z.string().optional(),
  itemDescription: z.string().trim().min(1, 'Item description is required').max(2000, 'Description must be less than 2000 characters'),
  referenceUrls: z.string().max(1000, 'Reference URLs must be less than 1000 characters').optional(),
}).refine((data) => {
  if (data.timeSensitive && !data.neededByDate) {
    return false;
  }
  return true;
}, {
  message: 'Please select a needed-by date for time-sensitive requests',
  path: ['neededByDate'],
});

type RequestFormData = z.infer<typeof requestSchema>;

export default function RequestPage() {
  const [formData, setFormData] = useState<RequestFormData>({
    fullName: '',
    email: '',
    phone: '',
    shippingAddress: '',
    park: '',
    timeSensitive: false,
    neededByDate: '',
    itemDescription: '',
    referenceUrls: '',
  });
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<{ requestId: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 5) {
      toast.error('You can upload up to 5 images');
      return;
    }

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    setImages(prev => [...prev, ...validFiles]);
    
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = requestSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('full_name', formData.fullName);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('shipping_address', formData.shippingAddress);
      formDataToSend.append('park', formData.park);
      formDataToSend.append('time_sensitive', formData.timeSensitive ? '1' : '0');
      if (formData.neededByDate) {
        formDataToSend.append('needed_by_date', formData.neededByDate);
      }
      formDataToSend.append('item_description', formData.itemDescription);
      if (formData.referenceUrls) {
        formDataToSend.append('reference_urls', formData.referenceUrls);
      }

      images.forEach((image, index) => {
        formDataToSend.append(`images[${index}]`, image);
      });

      const response = await apiRequest<RequestSubmissionResponse>(
        apiEndpoints.submitRequest,
        {
          method: 'POST',
          body: formDataToSend,
        }
      );

      if (response.success && response.data) {
        setSubmitSuccess({ requestId: response.data.request_id });
      } else {
        toast.error(response.error || 'Failed to submit request. Please try again.');
      }
    } catch {
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <main className="pt-20 min-h-screen bg-background">
        <section className="section-padding">
          <div className="container-tight">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-lg mx-auto text-center"
            >
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="font-heading text-3xl font-bold text-foreground mb-4">
                Request Submitted!
              </h1>
              <p className="text-muted-foreground mb-6">
                Your request has been received. We'll review it and get back to you within 24 hours.
              </p>
              <div className="bg-secondary rounded-xl p-6 mb-8">
                <p className="text-sm text-muted-foreground mb-2">Your Request ID</p>
                <p className="text-2xl font-bold text-gold font-mono">{submitSuccess.requestId}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Save this ID to track your request
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="gold" asChild>
                  <Link to="/portal">Go to Client Portal</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/">Back to Home</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="pt-20">
      {/* Hero */}
      <section className="bg-magic py-16">
        <div className="container-wide text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4">
              Submit a Request
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
              Tell us what items you're looking for and we'll find them for you!
            </p>
          </motion.div>
        </div>
      </section>

      {/* Request Form */}
      <section className="section-padding bg-background">
        <div className="container-tight">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="bg-card rounded-2xl p-8 shadow-card border border-border/50"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Information */}
              <div>
                <h2 className="font-heading text-xl font-semibold text-foreground mb-4">
                  Contact Information
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Your full name"
                      className={errors.fullName ? 'border-destructive' : ''}
                    />
                    {errors.fullName && (
                      <p className="text-sm text-destructive">{errors.fullName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your@email.com"
                      className={errors.email ? 'border-destructive' : ''}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                      className={errors.phone ? 'border-destructive' : ''}
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="park">Park *</Label>
                    <Select
                      value={formData.park}
                      onValueChange={(value) => setFormData({ ...formData, park: value })}
                    >
                      <SelectTrigger className={errors.park ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select a park" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disney">Disney World</SelectItem>
                        <SelectItem value="universal">Universal Orlando</SelectItem>
                        <SelectItem value="seaworld">SeaWorld</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.park && (
                      <p className="text-sm text-destructive">{errors.park}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="space-y-2">
                <Label htmlFor="shippingAddress">Shipping Address *</Label>
                <Textarea
                  id="shippingAddress"
                  value={formData.shippingAddress}
                  onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                  placeholder="Enter your full shipping address including street, city, state, and zip code"
                  rows={3}
                  className={errors.shippingAddress ? 'border-destructive' : ''}
                />
                {errors.shippingAddress && (
                  <p className="text-sm text-destructive">{errors.shippingAddress}</p>
                )}
              </div>

              {/* Time Sensitive */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="timeSensitive"
                    checked={formData.timeSensitive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, timeSensitive: checked as boolean })
                    }
                  />
                  <Label htmlFor="timeSensitive" className="cursor-pointer">
                    This request is time-sensitive
                  </Label>
                </div>

                {formData.timeSensitive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="neededByDate">Needed By *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="neededByDate"
                        type="date"
                        value={formData.neededByDate}
                        onChange={(e) => setFormData({ ...formData, neededByDate: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        className={`pl-10 ${errors.neededByDate ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {errors.neededByDate && (
                      <p className="text-sm text-destructive">{errors.neededByDate}</p>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Item Description */}
              <div className="space-y-2">
                <Label htmlFor="itemDescription">Item Description *</Label>
                <Textarea
                  id="itemDescription"
                  value={formData.itemDescription}
                  onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value })}
                  placeholder="Describe the items you're looking for in detail. Include sizes, colors, variations, etc."
                  rows={5}
                  className={errors.itemDescription ? 'border-destructive' : ''}
                />
                {errors.itemDescription && (
                  <p className="text-sm text-destructive">{errors.itemDescription}</p>
                )}
              </div>

              {/* Reference URLs */}
              <div className="space-y-2">
                <Label htmlFor="referenceUrls">Reference URLs (optional)</Label>
                <Textarea
                  id="referenceUrls"
                  value={formData.referenceUrls}
                  onChange={(e) => setFormData({ ...formData, referenceUrls: e.target.value })}
                  placeholder="Paste links to items you want (one per line)"
                  rows={3}
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Reference Images (optional, 1-5 images)</Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-gold/50 transition-colors cursor-pointer"
                >
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG up to 10MB each • {5 - images.length} slots remaining
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 mt-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full aspect-square object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                variant="gold"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </form>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
