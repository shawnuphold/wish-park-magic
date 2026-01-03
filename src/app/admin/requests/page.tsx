// @ts-nocheck
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SwipeableCard } from '@/components/SwipeableCard';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { QuickAddRequest } from '@/components/QuickAddRequest';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  MoreVertical,
  Calendar,
  Package,
  ChevronRight,
  CheckCircle,
  FileText,
  XCircle,
  Edit,
  Eye,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type RequestStatus = 'pending' | 'quoted' | 'approved' | 'scheduled' | 'shopping' | 'found' | 'invoiced' | 'paid' | 'shipped' | 'delivered';

interface RequestWithDetails {
  id: string;
  status: RequestStatus;
  created_at: string;
  quoted_total: number | null;
  customer: { id: string; name: string; email: string };
  item_count: number;
  first_item_name?: string;
}

const statusFilters: { value: RequestStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'approved', label: 'Approved' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'found', label: 'Found' },
  { value: 'invoiced', label: 'Invoiced' },
  { value: 'paid', label: 'Paid' },
  { value: 'shipped', label: 'Shipped' },
];

export default function RequestsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select(`
          id,
          status,
          created_at,
          quoted_total,
          customer:customers(id, name, email),
          items:request_items(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests(
        data?.map((r) => ({
          id: r.id,
          status: r.status as RequestStatus,
          created_at: r.created_at,
          quoted_total: r.quoted_total,
          customer: r.customer as { id: string; name: string; email: string },
          item_count: (r.items as { id: string; name: string }[])?.length || 0,
          first_item_name: (r.items as { id: string; name: string }[])?.[0]?.name,
        })) || []
      );
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleMarkFound = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('requests')
        .update({ status: 'found' })
        .eq('id', requestId);

      if (error) throw error;

      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'found' as RequestStatus } : r))
      );

      toast({
        title: 'Marked as Found',
        description: 'Request status updated to found.',
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status.',
        variant: 'destructive',
      });
    }
  };

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

  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.customer?.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          <h1 className="text-xl lg:text-2xl font-heading font-bold text-foreground">Requests</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">Manage shopping requests</p>
        </div>
        <Link href="/admin/requests/new">
          <Button variant="gold" size="sm" className="lg:hidden">
            <Plus className="w-5 h-5" />
          </Button>
          <Button variant="gold" className="hidden lg:flex">
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Search and filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 lg:h-10 lg:max-w-sm"
          />
        </div>

        {/* Status filter chips - horizontal scroll on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 lg:flex-wrap scrollbar-hide">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                statusFilter === filter.value
                  ? "bg-gold text-midnight"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {filter.label}
              {filter.value !== 'all' && (
                <span className="ml-1 opacity-70">
                  ({requests.filter((r) => r.status === filter.value).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Request count */}
      <div className="flex items-center justify-between lg:hidden">
        <Badge variant="secondary">{filteredRequests.length} requests</Badge>
      </div>

      {/* Request list */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No requests found</p>
          <Link href="/admin/requests/new">
            <Button variant="outline" className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Create your first request
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile: Swipeable cards */}
          <div className="space-y-3 lg:hidden">
            {filteredRequests.map((request) => (
              <SwipeableCard
                key={request.id}
                onSwipeRight={() => handleMarkFound(request.id)}
                rightAction={
                  <div className="flex flex-col items-center text-white">
                    <CheckCircle className="w-6 h-6 mb-1" />
                    <span className="text-xs font-medium">Found</span>
                  </div>
                }
                leftActions={
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-muted-foreground"
                      onClick={() => router.push(`/admin/requests/${request.id}`)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-blue-600"
                      onClick={() => router.push(`/admin/invoices?request=${request.id}`)}
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                  </div>
                }
              >
                <div
                  className="p-4 cursor-pointer active:bg-muted/50"
                  onClick={() => router.push(`/admin/requests/${request.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Avatar and info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-gold font-semibold">
                          {request.customer?.name?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {request.customer?.name || 'Unknown'}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {request.first_item_name || 'No items'}
                          {request.item_count > 1 && ` +${request.item_count - 1} more`}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {request.item_count} item{request.item_count !== 1 ? 's' : ''}
                          </span>
                          {request.quoted_total && (
                            <span className="font-medium text-foreground">
                              ${request.quoted_total.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status and date */}
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={cn("text-xs", getStatusColor(request.status))}>
                        {request.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(request.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </SwipeableCard>
            ))}
          </div>

          {/* Desktop: Table layout */}
          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Items</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Total</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                    <th className="w-[50px] p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRequests.map((request) => (
                    <tr
                      key={request.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/admin/requests/${request.id}`)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
                            <span className="text-gold font-semibold text-sm">
                              {request.customer?.name?.[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">{request.customer?.name || 'Unknown'}</span>
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {request.first_item_name || 'No items'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        {request.item_count} item{request.item_count !== 1 ? 's' : ''}
                      </td>
                      <td className="p-4 text-sm font-medium">
                        {request.quoted_total ? `$${request.quoted_total.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-4">
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
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
                              <Link href={`/admin/requests/${request.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkFound(request.id);
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Mark as Found
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/invoices?request=${request.id}`}>
                                <FileText className="w-4 h-4 mr-2" />
                                Create Invoice
                              </Link>
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

      {/* Mobile swipe hint */}
      <div className="lg:hidden text-center py-4 pb-20">
        <p className="text-xs text-muted-foreground">
          Swipe right to mark found • Swipe left for more options
        </p>
      </div>

      {/* Floating Action Button (mobile only) */}
      <FloatingActionButton
        onClick={() => setShowQuickAdd(true)}
        icon={<Plus className="w-6 h-6" />}
        label="New Request"
      />

      {/* Quick Add Request Bottom Sheet */}
      <QuickAddRequest
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onSuccess={fetchRequests}
      />
    </div>
  );
}
