import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PartyPopper, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

interface Product {
  id: string;
  title: string;
  image_url: string;
  price_estimate: number | null;
}

interface RequestModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

const requestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().trim().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  phone: z.string().trim().max(20, 'Phone must be less than 20 characters').optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1').max(99, 'Maximum quantity is 99'),
  notes: z.string().trim().max(500, 'Notes must be less than 500 characters').optional(),
  notifySimilar: z.boolean(),
});

export function RequestModal({ product, isOpen, onClose }: RequestModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [notifySimilar, setNotifySimilar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setQuantity(1);
    setNotes('');
    setNotifySimilar(false);
    setErrors({});
    setIsSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form data
    const result = requestSchema.safeParse({
      name,
      email,
      phone: phone || undefined,
      quantity,
      notes: notes || undefined,
      notifySimilar,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('contact_submissions').insert({
        type: 'product_request',
        name,
        email,
        phone: phone || null,
        product_id: product?.id,
        product_name: product?.title,
        quantity,
        message: notes || null,
        notify_similar: notifySimilar,
      });

      if (error) throw error;

      setIsSuccess(true);
    } catch (error) {
      console.error('Error submitting request:', error);
      setErrors({ form: 'Failed to submit request. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!product) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-midnight/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 bg-background rounded-t-2xl md:rounded-2xl shadow-elevated z-50 max-h-[90vh] overflow-y-auto md:max-w-lg md:w-full"
          >
            {/* Header */}
            <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold">Request This Item</h2>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {isSuccess ? (
              /* Success State */
              <div className="p-6 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                  className="w-20 h-20 mx-auto mb-4 bg-gold/20 rounded-full flex items-center justify-center"
                >
                  <PartyPopper className="w-10 h-10 text-gold" />
                </motion.div>
                
                {/* Confetti Animation */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {[...Array(30)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ 
                        opacity: 1,
                        x: '50%', 
                        y: 0,
                        scale: 0 
                      }}
                      animate={{ 
                        opacity: [1, 1, 0],
                        x: `${50 + (Math.random() - 0.5) * 100}%`,
                        y: `${50 + Math.random() * 50}%`,
                        scale: [0, 1, 1],
                        rotate: Math.random() * 360
                      }}
                      transition={{ 
                        duration: 1.5, 
                        delay: Math.random() * 0.3,
                        ease: 'easeOut'
                      }}
                      className="absolute w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: ['#d4af37', '#9333ea', '#ec4899', '#3b82f6', '#22c55e'][Math.floor(Math.random() * 5)]
                      }}
                    />
                  ))}
                </div>
                
                <h3 className="font-heading text-2xl font-bold text-foreground mb-2">
                  Request Received!
                </h3>
                <p className="text-muted-foreground mb-6">
                  Check your email for confirmation. We'll get back to you within 24 hours!
                </p>
                <Button variant="gold" onClick={handleClose}>
                  Close
                </Button>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="p-6">
                {/* Product Preview */}
                <div className="flex items-center gap-4 mb-6 p-4 bg-muted rounded-lg">
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div>
                    <h3 className="font-semibold text-foreground line-clamp-2">{product.title}</h3>
                    {product.price_estimate && (
                      <p className="text-sm text-gold font-medium">~${product.price_estimate.toFixed(2)}</p>
                    )}
                  </div>
                </div>

                {errors.form && (
                  <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                    {errors.form}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Your Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Smith"
                      className={errors.name ? 'border-destructive' : ''}
                    />
                    {errors.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                      className={errors.email ? 'border-destructive' : ''}
                    />
                    {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      max={99}
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className={errors.quantity ? 'border-destructive' : ''}
                    />
                    {errors.quantity && <p className="text-destructive text-xs mt-1">{errors.quantity}</p>}
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any specific size, color, or details?"
                      rows={3}
                    />
                    {errors.notes && <p className="text-destructive text-xs mt-1">{errors.notes}</p>}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notify"
                      checked={notifySimilar}
                      onCheckedChange={(checked) => setNotifySimilar(checked === true)}
                    />
                    <Label htmlFor="notify" className="text-sm cursor-pointer">
                      I'd like to be notified about similar items
                    </Label>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-4 mb-6">
                  We'll confirm availability and send you a quote within 24 hours.
                </p>

                <Button 
                  type="submit" 
                  variant="gold" 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Request'
                  )}
                </Button>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
