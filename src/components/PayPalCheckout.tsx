import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CartItem } from '@/hooks/useCart';
import { toast } from 'sonner';
import { CheckCircle, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: {
        style?: {
          layout?: string;
          color?: string;
          shape?: string;
          label?: string;
          height?: number;
        };
        createOrder: (data: unknown, actions: {
          order: {
            create: (orderData: {
              purchase_units: Array<{
                amount: { value: string; currency_code: string };
                description?: string;
              }>;
            }) => Promise<string>;
          };
        }) => Promise<string>;
        onApprove: (data: { orderID: string }, actions: {
          order: {
            capture: () => Promise<{
              id: string;
              purchase_units: Array<{
                payments: {
                  captures: Array<{ id: string }>;
                };
              }>;
            }>;
          };
        }) => Promise<void>;
        onError: (err: Error) => void;
        onCancel: () => void;
      }) => {
        render: (container: HTMLElement) => void;
      };
    };
  }
}

interface PayPalCheckoutProps {
  items: CartItem[];
  total: number;
  onSuccess: (orderId: string, transactionId: string) => void;
  onClose: () => void;
  open: boolean;
}

export function PayPalCheckout({ items, total, onSuccess, onClose, open }: PayPalCheckoutProps) {
  const paypalRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderDetails, setOrderDetails] = useState<{ orderId: string; transactionId: string } | null>(null);
  const buttonsRendered = useRef(false);

  useEffect(() => {
    if (!open || !paypalRef.current || buttonsRendered.current || orderComplete) return;

    const renderPayPalButtons = () => {
      if (!window.paypal || !paypalRef.current) return;

      // Clear any existing buttons
      paypalRef.current.innerHTML = '';

      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal',
          height: 50,
        },
        createOrder: (_data, actions) => {
          return actions.order.create({
            purchase_units: [{
              amount: {
                value: total.toFixed(2),
                currency_code: 'USD',
              },
              description: `Enchanted Park Pickups - ${items.length} item(s)`,
            }],
          });
        },
        onApprove: async (data, actions) => {
          setIsProcessing(true);
          try {
            const details = await actions.order.capture();
            const transactionId = details.purchase_units[0]?.payments?.captures[0]?.id || '';
            
            setOrderDetails({
              orderId: data.orderID,
              transactionId,
            });
            setOrderComplete(true);
            onSuccess(data.orderID, transactionId);
          } catch (error) {
            console.error('Payment capture error:', error);
            toast.error('Payment could not be processed. Please try again.');
          } finally {
            setIsProcessing(false);
          }
        },
        onError: (err) => {
          console.error('PayPal error:', err);
          toast.error('An error occurred with PayPal. Please try again.');
          setIsProcessing(false);
        },
        onCancel: () => {
          toast.info('Payment cancelled');
        },
      }).render(paypalRef.current!);

      buttonsRendered.current = true;
    };

    // Small delay to ensure PayPal SDK is loaded
    const timeout = setTimeout(renderPayPalButtons, 100);

    return () => {
      clearTimeout(timeout);
    };
  }, [open, items, total, onSuccess, orderComplete]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      buttonsRendered.current = false;
      setOrderComplete(false);
      setOrderDetails(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {orderComplete ? 'Order Complete!' : 'Complete Your Purchase'}
          </DialogTitle>
          <DialogDescription>
            {orderComplete 
              ? 'Thank you for your order. You will receive a confirmation email shortly.'
              : 'Pay securely with PayPal'
            }
          </DialogDescription>
        </DialogHeader>

        {orderComplete ? (
          <div className="py-8 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Order ID: <span className="font-mono text-foreground">{orderDetails?.orderId}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Transaction ID: <span className="font-mono text-foreground">{orderDetails?.transactionId}</span>
              </p>
            </div>
            <Button variant="gold" onClick={onClose} className="mt-4">
              Continue Shopping
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Order Summary */}
            <div className="bg-secondary rounded-xl p-4 space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Order Summary</h4>
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-foreground">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="text-foreground font-medium">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="border-t border-border pt-3 flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-gold">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* PayPal Buttons Container */}
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-gold" />
                <p className="text-muted-foreground">Processing your payment...</p>
              </div>
            ) : (
              <div ref={paypalRef} className="min-h-[150px]" />
            )}

            <p className="text-xs text-center text-muted-foreground">
              By completing this purchase, you agree to our terms and conditions. All sales are final.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
