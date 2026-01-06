"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ClipboardList,
  Plus,
  Bell,
  BellOff,
  Camera,
} from 'lucide-react';
import type { Database, NotificationPreferences } from '@/lib/database.types';
import { AliasManager } from '@/components/admin/AliasManager';

type Customer = Database['public']['Tables']['customers']['Row'];
type Request = Database['public']['Tables']['requests']['Row'];

interface CustomerWithRequests extends Customer {
  requests: (Request & { item_count: number })[];
}

export default function CustomerDetailPage() {
  const { id } = useParams() as { id: string };
  const [customer, setCustomer] = useState<CustomerWithRequests | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        // @ts-expect-error - customers table not in generated types
        const { data, error } = await supabase
          .from('customers')
          .select(`
            *,
            requests(
              *,
              items:request_items(id)
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        // Cast to handle notification_preferences which may not be in generated types
        const customerData = data as Customer & { requests: any[] };
        setCustomer({
          ...customerData,
          notification_preferences: (customerData as any).notification_preferences || null,
          requests: customerData.requests?.map((r: any) => ({
            ...r,
            item_count: r.items?.length || 0,
          })) || [],
        });
      } catch (error) {
        console.error('Error fetching customer:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchCustomer();
  }, [id]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-600',
      quoted: 'bg-blue-500/10 text-blue-600',
      approved: 'bg-green-500/10 text-green-600',
      scheduled: 'bg-purple-500/10 text-purple-600',
      shopping: 'bg-orange-500/10 text-orange-600',
      found: 'bg-teal-500/10 text-teal-600',
      invoiced: 'bg-indigo-500/10 text-indigo-600',
      paid: 'bg-emerald-500/10 text-emerald-600',
      shipped: 'bg-cyan-500/10 text-cyan-600',
      delivered: 'bg-gray-500/10 text-gray-600',
    };
    return colors[status] || 'bg-gray-500/10 text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Customer not found</p>
        <Link href="/admin/customers">
          <Button variant="outline" className="mt-4">Back to Customers</Button>
        </Link>
      </div>
    );
  }

  const address = [
    customer.address_line1,
    customer.address_line2,
    [customer.city, customer.state, customer.postal_code].filter(Boolean).join(' '),
    customer.country,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center">
              <span className="text-gold font-bold text-lg">
                {customer.name[0].toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">{customer.name}</h1>
              <p className="text-muted-foreground">Customer since {new Date(customer.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
        <Link href={`/admin/customers/${customer.id}/edit`}>
          <Button variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              {customer.email ? (
                <a href={`mailto:${customer.email}`} className="text-sm hover:underline">
                  {customer.email}
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">No email</span>
              )}
            </div>
            {customer.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <a href={`tel:${customer.phone}`} className="text-sm hover:underline">
                  {customer.phone}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Shipping Address</CardTitle>
          </CardHeader>
          <CardContent>
            {address.length > 0 ? (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  {address.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No address on file</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Requests</span>
              <Badge variant="secondary">{customer.requests.length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Requests</span>
              <Badge variant="secondary">
                {customer.requests.filter((r) => r.status !== 'delivered').length}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linked Accounts */}
      <AliasManager customerId={customer.id} />

      {/* Notification Preferences */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            {(customer.notification_preferences as NotificationPreferences | null)?.enabled ? (
              <Bell className="w-4 h-4 text-gold" />
            ) : (
              <BellOff className="w-4 h-4 text-muted-foreground" />
            )}
            Notification Preferences
          </CardTitle>
          <Link href={`/admin/customers/${customer.id}/preferences`}>
            <Button variant="outline" size="sm">
              <Edit className="w-3 h-3 mr-2" />
              Edit
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {(() => {
            const prefs = customer.notification_preferences as NotificationPreferences | null;
            if (!prefs?.enabled) {
              return (
                <p className="text-sm text-muted-foreground">
                  Notifications disabled
                </p>
              );
            }

            return (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    Enabled
                  </Badge>
                  {prefs.park_exclusives_only && (
                    <Badge variant="outline">Park Exclusives Only</Badge>
                  )}
                </div>
                {prefs.parks.length > 0 && (
                  <p className="text-muted-foreground">
                    Parks: {prefs.parks.map(p =>
                      p === 'disney' ? 'Disney' : p === 'universal' ? 'Universal' : 'SeaWorld'
                    ).join(', ')}
                  </p>
                )}
                {prefs.categories.length > 0 && (
                  <p className="text-muted-foreground">
                    Categories: {prefs.categories.length} selected
                  </p>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {customer.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Requests</CardTitle>
          <div className="flex items-center gap-2">
            <Link href={`/admin/requests/from-screenshot?customer=${customer.id}&name=${encodeURIComponent(customer.name)}`}>
              <Button size="sm" variant="outline">
                <Camera className="w-4 h-4 mr-2" />
                From Screenshot
              </Button>
            </Link>
            <Link href={`/admin/requests/new?customer=${customer.id}`}>
              <Button size="sm" variant="gold">
                <Plus className="w-4 h-4 mr-2" />
                New Request
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {customer.requests.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {customer.requests.map((request) => (
                <Link
                  key={request.id}
                  href={`/admin/requests/${request.id}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {request.item_count} item{request.item_count !== 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(request.status)}>
                    {request.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
