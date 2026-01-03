"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  ClipboardList,
  ShoppingCart,
  Package,
  TrendingUp,
  ChevronRight,
  FileText,
  Sparkles,
  ShoppingBag,
  Settings,
  DollarSign,
  Calendar,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardStats {
  totalCustomers: number;
  activeRequests: number;
  pendingShipments: number;
  monthlyRevenue: number;
  upcomingTrips: number;
  completedToday: number;
}

interface ParkItemCounts {
  disney: number;
  universal: number;
  seaworld: number;
}

interface RecentRequest {
  id: string;
  customer_name: string;
  status: string;
  created_at: string;
  item_count: number;
}

interface RevenueData {
  month: string;
  revenue: number;
}

interface RequestStatusData {
  name: string;
  value: number;
  color: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    activeRequests: 0,
    pendingShipments: 0,
    monthlyRevenue: 0,
    upcomingTrips: 0,
    completedToday: 0,
  });
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [parkItemCounts, setParkItemCounts] = useState<ParkItemCounts>({
    disney: 0,
    universal: 0,
    seaworld: 0,
  });
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [requestStatusData, setRequestStatusData] = useState<RequestStatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartsMounted, setChartsMounted] = useState(false);

  // Delay chart rendering to avoid dimension issues
  useEffect(() => {
    const timer = setTimeout(() => setChartsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Calculate date ranges once
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const today = new Date().toISOString().split('T')[0];

        // Execute all independent queries in parallel for better performance
        const [
          customersResult,
          activeRequestsResult,
          pendingShipmentsResult,
          upcomingTripsResult,
          invoicesResult,
          revenueInvoicesResult,
          allRequestsResult,
          shoppingItemsResult,
          recentRequestsResult,
        ] = await Promise.all([
          // Count queries
          supabase.from('customers').select('*', { count: 'exact', head: true }),
          supabase.from('requests').select('*', { count: 'exact', head: true }).not('status', 'eq', 'delivered'),
          supabase.from('shipments').select('*', { count: 'exact', head: true }).in('status', ['pending', 'label_created']),
          supabase.from('shopping_trips').select('*', { count: 'exact', head: true }).eq('status', 'planned').gte('date', today),
          // Revenue queries
          supabase.from('invoices').select('total').eq('status', 'paid').gte('paid_at', startOfMonth.toISOString()),
          supabase.from('invoices').select('total, paid_at').eq('status', 'paid').gte('paid_at', sixMonthsAgo.toISOString()),
          // Status and items queries
          supabase.from('requests').select('status'),
          supabase.from('request_items').select('park, request:requests!inner(status)').eq('request.status', 'shopping').eq('status', 'pending'),
          // Recent requests
          supabase.from('requests').select('id, status, created_at, customer:customers(name), items:request_items(id)').order('created_at', { ascending: false }).limit(5),
        ]);

        // Process monthly revenue
        const monthlyRevenue = invoicesResult.data?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

        // Process 6-month revenue chart data
        const revenueByMonth: Record<string, number> = {};
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Initialize last 6 months with 0
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const key = `${monthNames[d.getMonth()]}`;
          revenueByMonth[key] = 0;
        }

        revenueInvoicesResult.data?.forEach((inv) => {
          if (inv.paid_at) {
            const date = new Date(inv.paid_at);
            const key = monthNames[date.getMonth()];
            revenueByMonth[key] = (revenueByMonth[key] || 0) + (inv.total || 0);
          }
        });

        setRevenueData(Object.entries(revenueByMonth).map(([month, revenue]) => ({ month, revenue })));

        // Process request status breakdown
        const statusCounts: Record<string, number> = {};
        allRequestsResult.data?.forEach((req) => {
          const status = req.status || 'pending';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        const statusColors: Record<string, string> = {
          pending: '#EAB308',
          quoted: '#3B82F6',
          approved: '#22C55E',
          scheduled: '#A855F7',
          shopping: '#F97316',
          found: '#14B8A6',
          invoiced: '#6366F1',
          paid: '#10B981',
          shipped: '#06B6D4',
          delivered: '#6B7280',
        };

        setRequestStatusData(
          Object.entries(statusCounts).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
            color: statusColors[name] || '#6B7280',
          }))
        );

        // Process pending items by park
        const parkCounts: ParkItemCounts = { disney: 0, universal: 0, seaworld: 0 };
        shoppingItemsResult.data?.forEach((item) => {
          const park = item.park as keyof ParkItemCounts;
          if (park in parkCounts) {
            parkCounts[park]++;
          }
        });
        setParkItemCounts(parkCounts);

        // Set stats
        setStats({
          totalCustomers: customersResult.count || 0,
          activeRequests: activeRequestsResult.count || 0,
          pendingShipments: pendingShipmentsResult.count || 0,
          monthlyRevenue,
          upcomingTrips: upcomingTripsResult.count || 0,
          completedToday: 0,
        });

        // Set recent requests
        setRecentRequests(
          recentRequestsResult.data?.map((r) => ({
            id: r.id,
            customer_name: (r.customer as { name: string })?.name || 'Unknown',
            status: r.status,
            created_at: r.created_at,
            item_count: (r.items as { id: string }[])?.length || 0,
          })) || []
        );
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    { title: 'Customers', value: stats.totalCustomers, icon: Users, color: 'text-blue-500', href: '/admin/customers' },
    { title: 'Active Requests', value: stats.activeRequests, icon: ClipboardList, color: 'text-amber-500', href: '/admin/requests' },
    { title: 'Pending Shipments', value: stats.pendingShipments, icon: Package, color: 'text-purple-500', href: '/admin/shipments' },
    { title: 'Upcoming Trips', value: stats.upcomingTrips, icon: ShoppingCart, color: 'text-green-500', href: '/admin/trips' },
  ];

  const quickLinks = [
    { title: 'Shopping', icon: ShoppingCart, href: '/admin/shopping', color: 'text-green-500' },
    { title: 'Invoices', icon: FileText, href: '/admin/invoices', color: 'text-indigo-500' },
    { title: 'Inventory', icon: ShoppingBag, href: '/admin/inventory', color: 'text-orange-500' },
    { title: 'Settings', icon: Settings, href: '/admin/settings', color: 'text-gray-500' },
  ];

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-heading font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome to Enchanted Park Pickups</p>
      </div>

      {/* Stats Grid - Clickable Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full active:scale-[0.98]">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs lg:text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`w-4 h-4 lg:w-5 lg:h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="text-2xl lg:text-3xl font-bold">{stat.value}</div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Start Shopping - Park Quick Actions */}
      {(parkItemCounts.disney > 0 || parkItemCounts.universal > 0 || parkItemCounts.seaworld > 0) && (
        <Card className="bg-gradient-to-r from-gold/10 to-gold/5 border-gold/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-gold" />
              Start Shopping
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              <Link href="/admin/shopping?park=disney">
                <div className="flex flex-col items-center p-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors cursor-pointer active:scale-[0.98]">
                  <span className="text-2xl mb-1">🏰</span>
                  <span className="text-xs font-medium text-blue-600">Disney</span>
                  {parkItemCounts.disney > 0 && (
                    <Badge className="mt-1 bg-blue-500 text-white text-xs">
                      {parkItemCounts.disney}
                    </Badge>
                  )}
                </div>
              </Link>
              <Link href="/admin/shopping?park=universal">
                <div className="flex flex-col items-center p-3 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 transition-colors cursor-pointer active:scale-[0.98]">
                  <span className="text-2xl mb-1">🎢</span>
                  <span className="text-xs font-medium text-purple-600">Universal</span>
                  {parkItemCounts.universal > 0 && (
                    <Badge className="mt-1 bg-purple-500 text-white text-xs">
                      {parkItemCounts.universal}
                    </Badge>
                  )}
                </div>
              </Link>
              <Link href="/admin/shopping?park=seaworld">
                <div className="flex flex-col items-center p-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors cursor-pointer active:scale-[0.98]">
                  <span className="text-2xl mb-1">🐬</span>
                  <span className="text-xs font-medium text-cyan-600">SeaWorld</span>
                  {parkItemCounts.seaworld > 0 && (
                    <Badge className="mt-1 bg-cyan-500 text-white text-xs">
                      {parkItemCounts.seaworld}
                    </Badge>
                  )}
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div className="grid gap-2 grid-cols-4">
        {quickLinks.map((link) => (
          <Link key={link.title} href={link.href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer active:scale-[0.98]">
              <CardContent className="p-3 flex flex-col items-center justify-center gap-1">
                <link.icon className={`w-5 h-5 ${link.color}`} />
                <span className="text-xs font-medium text-muted-foreground">{link.title}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base lg:text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] min-h-[200px]" style={{ minWidth: 0 }}>
              {chartsMounted && revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 12 }} />
                    <YAxis className="text-xs" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#22C55E"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {!chartsMounted ? 'Loading chart...' : 'No revenue data yet'}
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">This Month</span>
                <span className="text-lg font-bold text-green-600">${stats.monthlyRevenue.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Request Status Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base lg:text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-amber-500" />
              Request Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] min-h-[200px]" style={{ minWidth: 0 }}>
              {chartsMounted && requestStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={requestStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {requestStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [value, name]}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {!chartsMounted ? 'Loading chart...' : 'No request data yet'}
                </div>
              )}
            </div>
            {requestStatusData.length > 0 && (
              <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-2">
                {requestStatusData.slice(0, 4).map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base lg:text-lg">Recent Requests</CardTitle>
          <Link href="/admin/requests" className="text-sm text-gold hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {recentRequests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No requests yet</p>
              <Link
                href="/admin/requests/new"
                className="text-gold hover:underline text-sm font-medium"
              >
                Create your first request
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentRequests.map((request) => (
                <Link
                  key={request.id}
                  href={`/admin/requests/${request.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-gold font-semibold text-sm">
                        {request.customer_name[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{request.customer_name}</p>
                      <p className="text-xs lg:text-sm text-muted-foreground">
                        {request.item_count} item{request.item_count !== 1 ? 's' : ''} • {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(request.status)}>
                      {request.status}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
