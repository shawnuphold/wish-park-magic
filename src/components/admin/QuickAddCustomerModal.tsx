'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface QuickAddCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated: (customer: { id: string; name: string; email: string | null }) => void;
}

export function QuickAddCustomerModal({ open, onOpenChange, onCustomerCreated }: QuickAddCustomerModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [facebookName, setFacebookName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: 'Name is required',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      // Use provided email or NULL (no placeholder needed)
      const customerEmail = email.trim() || null;

      // Create customer
      // @ts-expect-error - customers table may not be in generated types
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: name.trim(),
          email: customerEmail,
          phone: phone.trim() || null,
          facebook_name: facebookName.trim() || null,
          country: 'US',
        })
        .select('id, name, email')
        .single();

      if (customerError) throw customerError;

      // If Facebook name provided, also add as alias
      if (facebookName.trim() && newCustomer) {
        // @ts-expect-error - customer_aliases table may not be in generated types
        await supabase
          .from('customer_aliases')
          .insert({
            customer_id: newCustomer.id,
            alias_type: 'facebook',
            alias_value: facebookName.trim().toLowerCase(),
            is_primary: true,
          });
      }

      toast({
        title: 'Customer created',
        description: `${name.trim()} has been added.`,
      });

      // Reset form
      setName('');
      setEmail('');
      setPhone('');
      setFacebookName('');

      // Callback with new customer
      onCustomerCreated({
        id: newCustomer.id,
        name: newCustomer.name,
        email: newCustomer.email,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating customer:', error);
      // Check for duplicate email constraint violation
      const errorStr = JSON.stringify(error).toLowerCase();
      const isDuplicateEmail = error?.message?.toLowerCase().includes('duplicate key') ||
                               error?.message?.toLowerCase().includes('unique constraint') ||
                               error?.message?.toLowerCase().includes('already exists') ||
                               error?.code === '23505' ||
                               errorStr.includes('duplicate') ||
                               errorStr.includes('unique');
      toast({
        title: 'Error creating customer',
        description: isDuplicateEmail
          ? 'A customer with this email already exists'
          : (error instanceof Error ? error.message : 'Unknown error'),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Quick Add Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer name"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="555-123-4567"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="facebookName">Facebook Name</Label>
              <Input
                id="facebookName"
                value={facebookName}
                onChange={(e) => setFacebookName(e.target.value)}
                placeholder="Facebook display name"
              />
              <p className="text-xs text-muted-foreground">
                Will be saved as a linked account for matching
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create & Select
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
