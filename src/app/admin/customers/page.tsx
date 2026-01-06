"use client";

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Search,
  MoreVertical,
  Mail,
  Phone,
  MessageSquare,
  MapPin,
  Trash2,
  Edit,
  Eye,
  Upload,
  Download,
  Loader2,
  CheckCircle,
  XCircle,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Customer {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  country: string;
  created_at: string;
  request_count?: number;
}

interface ImportResult {
  success: number;
  failed: number;
  skipped: number;
  errors: string[];
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          requests:requests(id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCustomers(
        data?.map((c) => ({
          ...c,
          request_count: (c.requests as { id: string }[])?.length || 0,
        })) || []
      );
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      setCustomers((prev) => prev.filter((c) => c.id !== deleteId));
      toast({
        title: 'Customer deleted',
        description: 'The customer has been removed.',
      });
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete customer. They may have existing requests.',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  };

  // Parse CSV text into array of objects
  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const parseRow = (row: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_'));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseRow(lines[i]);
      if (values.length === headers.length) {
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        rows.push(row);
      }
    }

    return rows;
  };

  const mapToCustomer = (row: Record<string, string>) => {
    const getName = () =>
      row.name || row.recipient_name || row.full_name || row.customer_name ||
      `${row.first_name || ''} ${row.last_name || ''}`.trim() || '';

    const getEmail = () =>
      row.email || row.email_address || row.recipient_email || '';

    const getPhone = () =>
      row.phone || row.phone_number || row.telephone || row.recipient_phone || '';

    const getAddress1 = () =>
      row.address_line1 || row.address_1 || row.street_address || row.address || row.street1 || '';

    const getAddress2 = () =>
      row.address_line2 || row.address_2 || row.street2 || row.apt || row.suite || '';

    const getCity = () =>
      row.city || row.recipient_city || '';

    const getState = () =>
      row.state || row.state_province || row.province || row.recipient_state || '';

    const getPostalCode = () =>
      row.postal_code || row.zip || row.zip_code || row.zipcode || row.postcode || '';

    const getCountry = () =>
      row.country || row.country_code || 'US';

    return {
      name: getName(),
      email: getEmail(),
      phone: getPhone() || null,
      address_line1: getAddress1() || null,
      address_line2: getAddress2() || null,
      city: getCity() || null,
      state: getState() || null,
      postal_code: getPostalCode() || null,
      country: getCountry() || 'US',
    };
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    setImportDialogOpen(true);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      const result: ImportResult = {
        success: 0,
        failed: 0,
        skipped: 0,
        errors: [],
      };

      // Only track non-null, non-placeholder emails for duplicate detection
      const existingEmails = new Set(
        customers
          .filter(c => c.email && !c.email.includes('placeholder') && !c.email.includes('noemail'))
          .map(c => c.email!.toLowerCase())
      );

      for (const row of rows) {
        const customer = mapToCustomer(row);

        // Only name is required, email is optional
        if (!customer.name) {
          result.skipped++;
          continue;
        }

        // Only check for duplicates if email is provided and not a placeholder
        if (customer.email && !customer.email.includes('placeholder') && !customer.email.includes('noemail')) {
          if (existingEmails.has(customer.email.toLowerCase())) {
            result.skipped++;
            continue;
          }
        }

        try {
          const { error } = await supabase
            .from('customers')
            .insert(customer);

          if (error) {
            result.failed++;
            if (result.errors.length < 5) {
              result.errors.push(`${customer.name}: ${error.message}`);
            }
          } else {
            result.success++;
            // Track email for duplicate detection if provided
            if (customer.email && !customer.email.includes('placeholder')) {
              existingEmails.add(customer.email.toLowerCase());
            }
          }
        } catch (err: any) {
          result.failed++;
          if (result.errors.length < 5) {
            result.errors.push(`${customer.name}: ${err.message}`);
          }
        }
      }

      setImportResult(result);

      if (result.success > 0) {
        fetchCustomers();
      }
    } catch (error: any) {
      toast({
        title: 'Import failed',
        description: error.message || 'Failed to parse CSV file',
        variant: 'destructive',
      });
      setImportDialogOpen(false);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExport = async () => {
    try {
      const { data: fullCustomers, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');

      if (error) throw error;

      const headers = ['Name', 'Email', 'Phone', 'Address Line 1', 'Address Line 2', 'City', 'State', 'Postal Code', 'Country', 'Notes'];

      const csvRows = (fullCustomers || []).map(c => {
        return [
          c.name,
          c.email,
          c.phone || '',
          c.address_line1 || '',
          c.address_line2 || '',
          c.city || '',
          c.state || '',
          c.postal_code || '',
          c.country || 'US',
          c.notes || '',
        ].map(val => `"${(val || '').replace(/"/g, '""')}"`).join(',');
      });

      const csv = [headers.join(','), ...csvRows].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export complete',
        description: `Exported ${fullCustomers?.length || 0} customers to CSV`,
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message || 'Failed to export customers',
        variant: 'destructive',
      });
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-heading font-bold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">Manage your customer database</p>
        </div>

        {/* Desktop buttons */}
        <div className="hidden sm:flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImport}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={customers.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Link href="/admin/customers/new">
            <Button variant="gold" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </Link>
        </div>

        {/* Mobile buttons */}
        <div className="flex sm:hidden items-center gap-2">
          <Link href="/admin/customers/new">
            <Button variant="gold" size="icon" className="h-10 w-10">
              <Plus className="w-5 h-5" />
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport} disabled={customers.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </div>

      {/* Search bar - sticky on mobile */}
      <div className="sticky top-0 z-10 bg-muted/30 -mx-4 px-4 py-2 lg:static lg:mx-0 lg:px-0 lg:py-0 lg:bg-transparent">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 lg:h-10 lg:max-w-sm"
          />
        </div>
        <div className="flex items-center justify-between mt-2 lg:hidden">
          <Badge variant="secondary">{filteredCustomers.length} customers</Badge>
        </div>
      </div>

      {/* Customer list */}
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No customers found</p>
          <Link href="/admin/customers/new">
            <Button variant="outline" className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Add your first customer
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile: Card layout */}
          <div className="space-y-3 lg:hidden">
            {filteredCustomers.map((customer) => (
              <Card
                key={customer.id}
                className="overflow-hidden active:scale-[0.98] transition-transform cursor-pointer"
                onClick={() => router.push(`/admin/customers/${customer.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Avatar and info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-gold font-semibold text-lg">
                          {customer.name[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {customer.name}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                          {customer.city || customer.state ? (
                            <>
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">
                                {[customer.city, customer.state].filter(Boolean).join(', ')}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground/60">No location</span>
                          )}
                          <span className="mx-1">•</span>
                          <span>{customer.request_count} request{customer.request_count !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>

                    {/* Menu button */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/customers/${customer.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/customers/${customer.id}/edit`}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(customer.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                    {customer.phone && (
                      <>
                        <a
                          href={`tel:${customer.phone}`}
                          className="flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="outline" size="sm" className="w-full h-10">
                            <Phone className="w-4 h-4 mr-2" />
                            Call
                          </Button>
                        </a>
                        <a
                          href={`sms:${customer.phone}`}
                          className="flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="outline" size="sm" className="w-full h-10">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Text
                          </Button>
                        </a>
                      </>
                    )}
                    {customer.email && (
                      <a
                        href={`mailto:${customer.email}`}
                        className={cn("flex-1", !customer.phone && "max-w-[200px]")}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="outline" size="sm" className="w-full h-10">
                          <Mail className="w-4 h-4 mr-2" />
                          Email
                        </Button>
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/admin/customers/${customer.id}`);
                      }}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: Table layout */}
          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Contact</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Location</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Requests</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Joined</th>
                    <th className="w-[50px] p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/admin/customers/${customer.id}`)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
                            <span className="text-gold font-semibold text-sm">
                              {customer.name[0].toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium">{customer.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {customer.email ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="w-3 h-3 text-muted-foreground" />
                              {customer.email}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">No email</span>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {customer.city || customer.state ? (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            {[customer.city, customer.state].filter(Boolean).join(', ')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary">{customer.request_count}</Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(customer.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/customers/${customer.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/customers/${customer.id}/edit`}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(customer.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the customer and all their associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Customers</DialogTitle>
            <DialogDescription>
              {importing ? 'Importing customers from CSV...' : 'Import complete'}
            </DialogDescription>
          </DialogHeader>

          {importing ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gold mb-4" />
              <p className="text-muted-foreground">Processing CSV file...</p>
            </div>
          ) : importResult ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-lg bg-green-500/10">
                  <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">{importResult.success}</p>
                  <p className="text-sm text-muted-foreground">Imported</p>
                </div>
                <div className="p-4 rounded-lg bg-yellow-500/10">
                  <div className="w-6 h-6 rounded-full border-2 border-yellow-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-yellow-600">{importResult.skipped}</p>
                  <p className="text-sm text-muted-foreground">Skipped</p>
                </div>
                <div className="p-4 rounded-lg bg-red-500/10">
                  <XCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <p className="font-medium mb-1">Errors:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Skipped rows are duplicates or missing required name field.
              </p>

              <Button
                variant="gold"
                className="w-full"
                onClick={() => setImportDialogOpen(false)}
              >
                Done
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
