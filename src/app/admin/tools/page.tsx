'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calculator, Copy, Check, DollarSign, Percent, Package, Receipt, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// Reusable copy button component
function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      <span className="text-xs">{copied ? 'Copied!' : label}</span>
    </Button>
  );
}

// Format number as currency
function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ============================================
// SALES TAX CALCULATOR
// ============================================
function SalesTaxCalculator() {
  const [amount, setAmount] = useState('');
  const [taxRate, setTaxRate] = useState('6.5');
  const [totalForReverse, setTotalForReverse] = useState('');
  const [result, setResult] = useState<{ subtotal: number; tax: number; total: number } | null>(null);
  const [reverseResult, setReverseResult] = useState<{ preTax: number; tax: number } | null>(null);

  const taxPresets = [
    { label: 'Florida', value: '6.5' },
    { label: 'Florida + Orange County', value: '6.5' },
    { label: 'No Tax', value: '0' },
  ];

  const calculateTax = () => {
    const amountNum = parseFloat(amount) || 0;
    const rate = parseFloat(taxRate) / 100;
    const tax = amountNum * rate;
    const total = amountNum + tax;
    setResult({ subtotal: amountNum, tax, total });
  };

  const calculateReverse = () => {
    const totalNum = parseFloat(totalForReverse) || 0;
    const rate = parseFloat(taxRate) / 100;
    const preTax = totalNum / (1 + rate);
    const tax = totalNum - preTax;
    setReverseResult({ preTax, tax });
  };

  return (
    <div className="space-y-6">
      {/* Tax Rate Selection */}
      <div className="space-y-2">
        <Label>Tax Rate</Label>
        <div className="flex gap-2">
          <Select value={taxRate} onValueChange={setTaxRate}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {taxPresets.map((preset) => (
                <SelectItem key={preset.label} value={preset.value}>
                  {preset.label} ({preset.value}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1 max-w-[120px]">
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="pr-8"
              inputMode="decimal"
            />
            <Percent className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Calculate Tax Section */}
      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <Calculator className="h-4 w-4" />
          Calculate Tax (Before → After)
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Price before tax"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && calculateTax()}
              className="pl-9"
              inputMode="decimal"
            />
          </div>
          <Button onClick={calculateTax}>Calculate</Button>
        </div>

        {result && (
          <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
            <CardContent className="pt-4 pb-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>${formatCurrency(result.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">+ Tax ({taxRate}%):</span>
                  <span>${formatCurrency(result.tax)}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between items-center">
                  <span className="font-bold text-base">Total:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">${formatCurrency(result.total)}</span>
                    <CopyButton value={`$${formatCurrency(result.total)}`} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reverse Calculation Section */}
      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <RefreshCw className="h-4 w-4" />
          Reverse: Find Pre-Tax (After → Before)
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Total (with tax)"
              value={totalForReverse}
              onChange={(e) => setTotalForReverse(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && calculateReverse()}
              className="pl-9"
              inputMode="decimal"
            />
          </div>
          <Button onClick={calculateReverse} variant="secondary">Calculate</Button>
        </div>

        {reverseResult && (
          <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
            <CardContent className="pt-4 pb-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Pre-tax price:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base">${formatCurrency(reverseResult.preTax)}</span>
                    <CopyButton value={`$${formatCurrency(reverseResult.preTax)}`} />
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax included:</span>
                  <span>${formatCurrency(reverseResult.tax)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ============================================
// PAYPAL FEE CALCULATOR
// ============================================
function PayPalFeeCalculator() {
  const [amount, setAmount] = useState('');
  const [feeType, setFeeType] = useState('paypal-checkout');
  const [customPercent, setCustomPercent] = useState('3.49');
  const [customFixed, setCustomFixed] = useState('0.49');
  const [result, setResult] = useState<{
    amountEntered: number;
    fee: number;
    youReceive: number;
    toReceiveOriginal: number;
  } | null>(null);

  const feePresets: Record<string, { percent: number; fixed: number; label: string }> = {
    'paypal-checkout': { percent: 3.49, fixed: 0.49, label: 'PayPal Checkout' },
    'paypal-friends': { percent: 0, fixed: 0, label: 'PayPal Friends & Family' },
    'paypal-international': { percent: 4.49, fixed: 0.49, label: 'PayPal International' },
    'stripe': { percent: 2.9, fixed: 0.30, label: 'Stripe' },
    'venmo-business': { percent: 1.9, fixed: 0.10, label: 'Venmo Business' },
    'custom': { percent: parseFloat(customPercent) || 0, fixed: parseFloat(customFixed) || 0, label: 'Custom' },
  };

  const calculateFees = () => {
    const amountNum = parseFloat(amount) || 0;
    const preset = feePresets[feeType];
    const percentRate = (feeType === 'custom' ? parseFloat(customPercent) : preset.percent) / 100;
    const fixedFee = feeType === 'custom' ? parseFloat(customFixed) : preset.fixed;

    // Customer pays this amount, what do you receive?
    const fee = (amountNum * percentRate) + fixedFee;
    const youReceive = amountNum - fee;

    // To receive original amount, what should you charge?
    const toReceiveOriginal = (amountNum + fixedFee) / (1 - percentRate);

    setResult({
      amountEntered: amountNum,
      fee,
      youReceive,
      toReceiveOriginal
    });
  };

  const currentPreset = feePresets[feeType];

  return (
    <div className="space-y-6">
      {/* Fee Type Selection */}
      <div className="space-y-2">
        <Label>Fee Type</Label>
        <Select value={feeType} onValueChange={setFeeType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(feePresets).map(([key, preset]) => (
              <SelectItem key={key} value={key}>
                {preset.label} {key !== 'custom' && key !== 'paypal-friends' && `(${preset.percent}% + $${preset.fixed.toFixed(2)})`}
                {key === 'paypal-friends' && '(Free)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom Fee Inputs */}
      {feeType === 'custom' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Percentage Fee (%)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={customPercent}
              onChange={(e) => setCustomPercent(e.target.value)}
              inputMode="decimal"
            />
          </div>
          <div className="space-y-2">
            <Label>Fixed Fee ($)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={customFixed}
              onChange={(e) => setCustomFixed(e.target.value)}
              inputMode="decimal"
            />
          </div>
        </div>
      )}

      {/* Amount Input */}
      <div className="space-y-2">
        <Label>Amount Customer Pays</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="100.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && calculateFees()}
              className="pl-9 text-lg"
              inputMode="decimal"
            />
          </div>
          <Button onClick={calculateFees} size="lg">
            <Calculator className="w-4 h-4 mr-2" />
            Calculate
          </Button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6 space-y-4">
            {/* What You Receive */}
            <div className="space-y-2">
              <div className="flex justify-between items-center py-3 px-4 bg-green-100 dark:bg-green-950 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💰</span>
                  <span className="font-medium">Amount After Fees:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xl text-green-700 dark:text-green-400">
                    ${formatCurrency(result.youReceive)}
                  </span>
                  <CopyButton value={`$${formatCurrency(result.youReceive)}`} />
                </div>
              </div>

              <div className="flex justify-between text-sm text-muted-foreground px-1">
                <span>💸 Fees Taken:</span>
                <span className="text-red-600 dark:text-red-400">-${formatCurrency(result.fee)}</span>
              </div>
            </div>

            <div className="border-t" />

            {/* Reverse Calculation */}
            <div className="py-3 px-4 bg-amber-50 dark:bg-amber-950/50 rounded-lg">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔄</span>
                  <span className="text-sm">
                    To receive <span className="font-bold">${formatCurrency(result.amountEntered)}</span>, request:
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg text-amber-700 dark:text-amber-400">
                    ${formatCurrency(result.toReceiveOriginal)}
                  </span>
                  <CopyButton value={`$${formatCurrency(result.toReceiveOriginal)}`} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================
// SHIPPING MARKUP CALCULATOR
// ============================================
function ShippingMarkupCalculator() {
  const [shippingCost, setShippingCost] = useState('');
  const [packagingCost, setPackagingCost] = useState('');
  const [markupType, setMarkupType] = useState<'flat' | 'percent'>('percent');
  const [markupAmount, setMarkupAmount] = useState('15');
  const [result, setResult] = useState<{ carrier: number; packaging: number; markup: number; total: number } | null>(null);

  const calculate = () => {
    const carrier = parseFloat(shippingCost) || 0;
    const packaging = parseFloat(packagingCost) || 0;
    const baseTotal = carrier + packaging;

    let markup = 0;
    if (markupType === 'flat') {
      markup = parseFloat(markupAmount) || 0;
    } else {
      markup = baseTotal * ((parseFloat(markupAmount) || 0) / 100);
    }

    const total = baseTotal + markup;
    setResult({ carrier, packaging, markup, total });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Carrier Cost (from Shippo)</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="12.50"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
              className="pl-9"
              inputMode="decimal"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Packaging Materials</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="2.00"
              value={packagingCost}
              onChange={(e) => setPackagingCost(e.target.value)}
              className="pl-9"
              inputMode="decimal"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Markup Type</Label>
        <RadioGroup
          value={markupType}
          onValueChange={(v) => {
            setMarkupType(v as 'flat' | 'percent');
            setMarkupAmount(v === 'flat' ? '3.00' : '15');
          }}
          className="flex gap-6"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="flat" id="flat" />
            <Label htmlFor="flat" className="cursor-pointer">Flat fee</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="percent" id="percent" />
            <Label htmlFor="percent" className="cursor-pointer">Percentage</Label>
          </div>
        </RadioGroup>
        <div className="relative w-32">
          {markupType === 'flat' && (
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          )}
          <Input
            type="number"
            step="0.01"
            min="0"
            value={markupAmount}
            onChange={(e) => setMarkupAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && calculate()}
            className={markupType === 'flat' ? 'pl-9' : 'pr-8'}
            inputMode="decimal"
          />
          {markupType === 'percent' && (
            <Percent className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      <Button onClick={calculate}>
        <Calculator className="w-4 h-4 mr-2" />
        Calculate
      </Button>

      {result && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Carrier:</span>
                <span>${formatCurrency(result.carrier)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Packaging:</span>
                <span>${formatCurrency(result.packaging)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Markup ({markupType === 'percent' ? `${markupAmount}%` : 'flat'}):
                </span>
                <span>${formatCurrency(result.markup)}</span>
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center py-2 px-3 bg-gold/10 rounded-lg">
                  <span className="font-bold">💰 Charge Customer:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">${formatCurrency(result.total)}</span>
                    <CopyButton value={`$${formatCurrency(result.total)}`} />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================
// QUICK QUOTE CALCULATOR
// ============================================
function QuickQuoteCalculator() {
  const [itemsSubtotal, setItemsSubtotal] = useState('');
  const [pickupFeeType, setPickupFeeType] = useState<'flat' | 'percent'>('percent');
  const [pickupFeeAmount, setPickupFeeAmount] = useState('10');
  const [shipping, setShipping] = useState('');
  const [handling, setHandling] = useState('');
  const [addPayPalFee, setAddPayPalFee] = useState(true);
  const [addTax, setAddTax] = useState(true);
  const [taxRate, setTaxRate] = useState('6.5');
  const [result, setResult] = useState<{
    items: number;
    pickupFee: number;
    shipping: number;
    handling: number;
    subtotal: number;
    tax: number;
    paypalFee: number;
    total: number;
  } | null>(null);

  // Load defaults from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('quickQuoteDefaults');
    if (saved) {
      try {
        const defaults = JSON.parse(saved);
        if (defaults.pickupFeeType) setPickupFeeType(defaults.pickupFeeType);
        if (defaults.pickupFeeAmount) setPickupFeeAmount(defaults.pickupFeeAmount);
        if (defaults.addPayPalFee !== undefined) setAddPayPalFee(defaults.addPayPalFee);
        if (defaults.addTax !== undefined) setAddTax(defaults.addTax);
        if (defaults.taxRate) setTaxRate(defaults.taxRate);
      } catch {}
    }
  }, []);

  // Save defaults to localStorage
  useEffect(() => {
    localStorage.setItem('quickQuoteDefaults', JSON.stringify({
      pickupFeeType,
      pickupFeeAmount,
      addPayPalFee,
      addTax,
      taxRate,
    }));
  }, [pickupFeeType, pickupFeeAmount, addPayPalFee, addTax, taxRate]);

  const calculateQuote = () => {
    const items = parseFloat(itemsSubtotal) || 0;
    const shippingCost = parseFloat(shipping) || 0;
    const handlingCost = parseFloat(handling) || 0;

    let pickupFee = 0;
    if (pickupFeeType === 'flat') {
      pickupFee = parseFloat(pickupFeeAmount) || 0;
    } else {
      pickupFee = items * ((parseFloat(pickupFeeAmount) || 0) / 100);
    }

    const subtotal = items + pickupFee + shippingCost + handlingCost;

    const tax = addTax ? subtotal * ((parseFloat(taxRate) || 0) / 100) : 0;
    const afterTax = subtotal + tax;

    // PayPal fee on the total (3.49% + $0.49)
    let paypalFee = 0;
    if (addPayPalFee) {
      // Calculate what to charge so we receive afterTax
      const totalWithPayPal = (afterTax + 0.49) / (1 - 0.0349);
      paypalFee = totalWithPayPal - afterTax;
    }

    const total = afterTax + paypalFee;

    setResult({
      items,
      pickupFee,
      shipping: shippingCost,
      handling: handlingCost,
      subtotal,
      tax,
      paypalFee,
      total,
    });
  };

  const getBreakdownText = () => {
    if (!result) return '';
    let text = `Quote Breakdown:\n`;
    text += `Items: $${formatCurrency(result.items)}\n`;
    text += `Pickup Fee${pickupFeeType === 'percent' ? ` (${pickupFeeAmount}%)` : ''}: $${formatCurrency(result.pickupFee)}\n`;
    if (result.shipping > 0) text += `Shipping: $${formatCurrency(result.shipping)}\n`;
    if (result.handling > 0) text += `Handling: $${formatCurrency(result.handling)}\n`;
    if (result.tax > 0) text += `Tax (${taxRate}%): $${formatCurrency(result.tax)}\n`;
    if (result.paypalFee > 0) text += `PayPal Fee: $${formatCurrency(result.paypalFee)}\n`;
    text += `───────────\n`;
    text += `Total: $${formatCurrency(result.total)}`;
    return text;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Item(s) Subtotal</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="45.00"
              value={itemsSubtotal}
              onChange={(e) => setItemsSubtotal(e.target.value)}
              className="pl-9 text-lg"
              inputMode="decimal"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Pickup Fee</Label>
          <div className="flex gap-2 items-center">
            <RadioGroup
              value={pickupFeeType}
              onValueChange={(v) => {
                setPickupFeeType(v as 'flat' | 'percent');
                setPickupFeeAmount(v === 'flat' ? '6' : '10');
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="flat" id="pickup-flat" />
                <Label htmlFor="pickup-flat" className="cursor-pointer text-sm">Flat $6</Label>
              </div>
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="percent" id="pickup-percent" />
                <Label htmlFor="pickup-percent" className="cursor-pointer text-sm">10%</Label>
              </div>
            </RadioGroup>
            <div className="relative w-20">
              {pickupFeeType === 'flat' ? (
                <DollarSign className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
              ) : null}
              <Input
                type="number"
                step="0.01"
                min="0"
                value={pickupFeeAmount}
                onChange={(e) => setPickupFeeAmount(e.target.value)}
                className={pickupFeeType === 'flat' ? 'pl-7' : 'pr-6'}
                inputMode="decimal"
              />
              {pickupFeeType === 'percent' && (
                <Percent className="absolute right-2 top-3 h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Shipping Cost</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="12.50"
              value={shipping}
              onChange={(e) => setShipping(e.target.value)}
              className="pl-9"
              inputMode="decimal"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Handling/Packaging</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="2.00"
              value={handling}
              onChange={(e) => setHandling(e.target.value)}
              className="pl-9"
              inputMode="decimal"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="addTax"
            checked={addTax}
            onCheckedChange={(checked) => setAddTax(checked as boolean)}
          />
          <Label htmlFor="addTax" className="cursor-pointer flex items-center gap-1.5">
            Add Florida Tax
            <div className="relative w-14">
              <Input
                type="number"
                step="0.1"
                min="0"
                max="20"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="h-7 text-center text-xs pr-5"
                disabled={!addTax}
                inputMode="decimal"
              />
              <span className="absolute right-1.5 top-1.5 text-xs text-muted-foreground">%</span>
            </div>
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="addPayPal"
            checked={addPayPalFee}
            onCheckedChange={(checked) => setAddPayPalFee(checked as boolean)}
          />
          <Label htmlFor="addPayPal" className="cursor-pointer text-sm">
            Add PayPal Fee (customer pays)
          </Label>
        </div>
      </div>

      <Button onClick={calculateQuote} className="w-full md:w-auto" size="lg">
        <Receipt className="w-4 h-4 mr-2" />
        Generate Quote
      </Button>

      {result && (
        <Card className="bg-muted/50">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base flex items-center gap-2">
                📋 QUOTE BREAKDOWN
              </CardTitle>
              <CopyButton value={getBreakdownText()} label="Copy All" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items:</span>
                <span>${formatCurrency(result.items)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Pickup Fee {pickupFeeType === 'percent' && `(${pickupFeeAmount}%)`}:
                </span>
                <span>${formatCurrency(result.pickupFee)}</span>
              </div>
              {result.shipping > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping:</span>
                  <span>${formatCurrency(result.shipping)}</span>
                </div>
              )}
              {result.handling > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Handling:</span>
                  <span>${formatCurrency(result.handling)}</span>
                </div>
              )}
              <div className="border-t pt-2 mt-2 flex justify-between text-xs text-muted-foreground">
                <span>Subtotal:</span>
                <span>${formatCurrency(result.subtotal)}</span>
              </div>
              {result.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax ({taxRate}%):</span>
                  <span>${formatCurrency(result.tax)}</span>
                </div>
              )}
              {result.paypalFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PayPal Fee:</span>
                  <span>${formatCurrency(result.paypalFee)}</span>
                </div>
              )}
              <div className="border-t-2 border-double pt-3 mt-3">
                <div className="flex justify-between items-center py-2 px-3 bg-gold/10 rounded-lg">
                  <span className="font-bold text-lg">💰 TOTAL:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xl">${formatCurrency(result.total)}</span>
                    <CopyButton value={`$${formatCurrency(result.total)}`} />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================
export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Tools</h1>
        <p className="text-muted-foreground">Calculators for daily business operations</p>
      </div>

      <Tabs defaultValue="quick-quote" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quick-quote" className="flex items-center gap-2">
            <Receipt className="h-4 w-4 hidden sm:block" />
            <span>Quick Quote</span>
          </TabsTrigger>
          <TabsTrigger value="sales-tax" className="flex items-center gap-2">
            <Percent className="h-4 w-4 hidden sm:block" />
            <span>Sales Tax</span>
          </TabsTrigger>
          <TabsTrigger value="paypal" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 hidden sm:block" />
            <span>PayPal</span>
          </TabsTrigger>
          <TabsTrigger value="shipping" className="flex items-center gap-2">
            <Package className="h-4 w-4 hidden sm:block" />
            <span>Shipping</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quick-quote" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Quick Quote Calculator
              </CardTitle>
              <CardDescription>
                Calculate full order total including items, fees, shipping, tax, and payment processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QuickQuoteCalculator />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales-tax" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Sales Tax Calculator
              </CardTitle>
              <CardDescription>
                Calculate tax from amount or reverse-calculate pre-tax from total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SalesTaxCalculator />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paypal" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                PayPal Fee Calculator
              </CardTitle>
              <CardDescription>
                See what you receive after fees, and what to charge to receive a specific amount
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PayPalFeeCalculator />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipping" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Shipping Markup Calculator
              </CardTitle>
              <CardDescription>
                Calculate what to charge for shipping including handling and packaging
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ShippingMarkupCalculator />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
