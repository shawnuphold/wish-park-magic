'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Mail,
  MessageSquare,
  Settings,
  Save,
  Send,
  Plus,
  Pencil,
  Eye,
  History,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Bell,
  BellRing,
  Smartphone,
  Trash2,
} from 'lucide-react';

interface NotificationTemplate {
  id: string;
  type: 'email' | 'sms';
  trigger: string;
  name: string;
  email_subject?: string;
  email_html?: string;
  email_text?: string;
  sms_body?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface NotificationSettings {
  id: string;
  email_enabled: boolean;
  email_from_name: string;
  email_from_address: string;
  email_reply_to: string | null;
  sms_enabled: boolean;
  sms_from_name: string;
  send_invoice_notifications: boolean;
  send_shipping_notifications: boolean;
  send_delivery_notifications: boolean;
  send_new_release_notifications: boolean;
}

interface NotificationLog {
  id: string;
  type: string;
  recipient: string;
  subject: string | null;
  body: string;
  status: string;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  customer?: { name: string };
}

interface PushStatus {
  enabled: boolean;
  publicKey?: string;
  error?: string;
}

interface PushSubscriptionRecord {
  id: string;
  customer_id: string;
  endpoint: string;
  created_at: string;
  customer?: { name: string; email: string };
}

const AVAILABLE_VARIABLES = {
  invoice: [
    { name: 'customer_name', description: 'Customer full name' },
    { name: 'invoice_number', description: 'Invoice number (e.g., INV-01001)' },
    { name: 'total_amount', description: 'Total amount (e.g., 125.00)' },
    { name: 'items_list', description: 'HTML list of items (email only)' },
    { name: 'items_list_text', description: 'Plain text list of items' },
    { name: 'invoice_url', description: 'Link to view/pay invoice' },
    { name: 'due_date', description: 'Payment due date' },
  ],
  shipping: [
    { name: 'customer_name', description: 'Customer full name' },
    { name: 'tracking_number', description: 'Shipment tracking number' },
    { name: 'carrier', description: 'Shipping carrier (USPS, UPS, etc.)' },
    { name: 'tracking_url', description: 'Link to track package' },
    { name: 'items_list', description: 'HTML list of items (email only)' },
    { name: 'items_list_text', description: 'Plain text list of items' },
  ],
  delivery: [
    { name: 'customer_name', description: 'Customer full name' },
  ],
  new_release: [
    { name: 'customer_name', description: 'Customer full name' },
    { name: 'item_name', description: 'Product name' },
    { name: 'item_description', description: 'Product description' },
    { name: 'item_price', description: 'Product price' },
    { name: 'park', description: 'Park name (Disney, Universal, etc.)' },
    { name: 'image_url', description: 'Product image URL' },
    { name: 'request_url', description: 'Link to request item' },
    { name: 'unsubscribe_url', description: 'Unsubscribe link' },
  ],
};

export default function NotificationsPage() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');

  // Edit dialog state
  const [editTemplate, setEditTemplate] = useState<NotificationTemplate | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Preview dialog state
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  // Test send dialog state
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testTemplate, setTestTemplate] = useState<NotificationTemplate | null>(null);
  const [testSending, setTestSending] = useState(false);

  // Push notification state
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null);
  const [pushSubscriptions, setPushSubscriptions] = useState<PushSubscriptionRecord[]>([]);
  const [browserSubscribed, setBrowserSubscribed] = useState(false);
  const [pushSubscribing, setPushSubscribing] = useState(false);
  const [pushTesting, setPushTesting] = useState(false);

  // Using imported supabase client

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    // Load templates
    const { data: templatesData } = await supabase
      .from('notification_templates')
      .select('*')
      .order('type', { ascending: true })
      .order('trigger', { ascending: true });

    if (templatesData) setTemplates(templatesData);

    // Load settings
    const { data: settingsData } = await supabase
      .from('notification_settings')
      .select('*')
      .single();

    if (settingsData) setSettings(settingsData);

    // Load recent logs
    const { data: logsData } = await supabase
      .from('notification_log')
      .select('*, customer:customers(name)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (logsData) setLogs(logsData);

    // Load push notification data
    await loadPushData();

    setLoading(false);
  }

  async function loadPushData() {
    // Get push status
    try {
      const response = await fetch('/api/notifications/push');
      const status = await response.json();
      setPushStatus(status);
    } catch {
      setPushStatus({ enabled: false, error: 'Failed to fetch status' });
    }

    // Get push subscriptions
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*, customer:customers(name, email)')
      .order('created_at', { ascending: false });

    if (subs) setPushSubscriptions(subs);

    // Check if current browser is subscribed
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setBrowserSubscribed(!!subscription);
      } catch {
        setBrowserSubscribed(false);
      }
    }
  }

  async function subscribeBrowser() {
    if (!pushStatus?.publicKey) {
      alert('Push notifications not configured on server');
      return;
    }

    setPushSubscribing(true);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Notification permission denied');
        setPushSubscribing(false);
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pushStatus.publicKey),
      });

      // Send subscription to server (use 'admin' as customer ID for admin subscriptions)
      const response = await fetch('/api/notifications/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'admin',
          subscription: subscription.toJSON(),
        }),
      });

      if (response.ok) {
        setBrowserSubscribed(true);
        loadPushData();
        alert('Browser subscribed to push notifications!');
      } else {
        const error = await response.json();
        alert('Failed to subscribe: ' + error.error);
      }
    } catch (error) {
      console.error('Push subscription error:', error);
      alert('Failed to subscribe: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    setPushSubscribing(false);
  }

  async function unsubscribeBrowser() {
    setPushSubscribing(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe locally
        await subscription.unsubscribe();

        // Remove from server
        await fetch('/api/notifications/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: 'admin',
            endpoint: subscription.endpoint,
          }),
        });
      }

      setBrowserSubscribed(false);
      loadPushData();
      alert('Browser unsubscribed from push notifications');
    } catch (error) {
      console.error('Unsubscribe error:', error);
      alert('Failed to unsubscribe');
    }

    setPushSubscribing(false);
  }

  async function sendTestPush() {
    setPushTesting(true);

    try {
      const response = await fetch('/api/notifications/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Notification',
          body: 'This is a test push notification from Enchanted Park Pickups!',
          url: '/admin/notifications',
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Test notification sent! (${result.sent} delivered, ${result.failed} failed)`);
      } else {
        alert('Failed to send: ' + result.error);
      }
    } catch (error) {
      alert('Failed to send test notification');
    }

    setPushTesting(false);
  }

  async function deleteSubscription(sub: PushSubscriptionRecord) {
    if (!confirm('Remove this subscription?')) return;

    try {
      await fetch('/api/notifications/push', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: sub.customer_id,
          endpoint: sub.endpoint,
        }),
      });

      loadPushData();
    } catch {
      alert('Failed to remove subscription');
    }
  }

  // Helper function to convert VAPID key
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);

    const { error } = await supabase
      .from('notification_settings')
      .update({
        email_enabled: settings.email_enabled,
        email_from_name: settings.email_from_name,
        email_from_address: settings.email_from_address,
        email_reply_to: settings.email_reply_to,
        sms_enabled: settings.sms_enabled,
        sms_from_name: settings.sms_from_name,
        send_invoice_notifications: settings.send_invoice_notifications,
        send_shipping_notifications: settings.send_shipping_notifications,
        send_delivery_notifications: settings.send_delivery_notifications,
        send_new_release_notifications: settings.send_new_release_notifications,
      })
      .eq('id', settings.id);

    if (error) {
      alert('Failed to save settings: ' + error.message);
    } else {
      alert('Settings saved!');
    }

    setSaving(false);
  }

  async function saveTemplate() {
    if (!editTemplate) return;
    setSaving(true);

    const { error } = await supabase
      .from('notification_templates')
      .update({
        name: editTemplate.name,
        email_subject: editTemplate.email_subject,
        email_html: editTemplate.email_html,
        email_text: editTemplate.email_text,
        sms_body: editTemplate.sms_body,
        enabled: editTemplate.enabled,
      })
      .eq('id', editTemplate.id);

    if (error) {
      alert('Failed to save template: ' + error.message);
    } else {
      setEditDialogOpen(false);
      loadData();
    }

    setSaving(false);
  }

  async function toggleTemplateEnabled(template: NotificationTemplate) {
    const { error } = await supabase
      .from('notification_templates')
      .update({ enabled: !template.enabled })
      .eq('id', template.id);

    if (!error) {
      setTemplates(templates.map(t =>
        t.id === template.id ? { ...t, enabled: !t.enabled } : t
      ));
    }
  }

  function previewTemplate(template: NotificationTemplate) {
    // Replace variables with sample data
    let html = template.email_html || '';
    html = html.replace(/\{\{customer_name\}\}/g, 'Sarah Johnson');
    html = html.replace(/\{\{invoice_number\}\}/g, 'INV-01042');
    html = html.replace(/\{\{total_amount\}\}/g, '127.50');
    html = html.replace(/\{\{items_list\}\}/g, '<ul><li>Mickey Spirit Jersey - $79.99</li><li>Loungefly Mini Backpack - $85.00</li></ul>');
    html = html.replace(/\{\{invoice_url\}\}/g, 'https://enchantedparkpickups.com/invoice/abc123');
    html = html.replace(/\{\{tracking_number\}\}/g, '9400111899223847563012');
    html = html.replace(/\{\{carrier\}\}/g, 'USPS');
    html = html.replace(/\{\{tracking_url\}\}/g, 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223847563012');
    html = html.replace(/\{\{item_name\}\}/g, 'Figment Popcorn Bucket');
    html = html.replace(/\{\{item_description\}\}/g, 'Limited edition Figment-shaped popcorn bucket from EPCOT');
    html = html.replace(/\{\{item_price\}\}/g, '35.00');
    html = html.replace(/\{\{park\}\}/g, 'Disney World');
    html = html.replace(/\{\{image_url\}\}/g, 'https://example.com/figment.jpg');
    html = html.replace(/\{\{#if image_url\}\}/g, '');
    html = html.replace(/\{\{\/if\}\}/g, '');

    setPreviewHtml(html);
    setPreviewDialogOpen(true);
  }

  async function sendTestNotification() {
    if (!testTemplate) return;
    setTestSending(true);

    const recipient = testTemplate.type === 'email' ? testEmail : testPhone;

    const response = await fetch('/api/notifications/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: testTemplate.id,
        recipient,
      }),
    });

    const result = await response.json();

    if (result.success) {
      alert('Test notification sent!');
      setTestDialogOpen(false);
      loadData(); // Refresh logs
    } else {
      alert('Failed to send: ' + result.error);
    }

    setTestSending(false);
  }

  function getTriggerVariables(trigger: string) {
    if (trigger.includes('invoice')) return AVAILABLE_VARIABLES.invoice;
    if (trigger.includes('ship')) return AVAILABLE_VARIABLES.shipping;
    if (trigger.includes('deliver')) return AVAILABLE_VARIABLES.delivery;
    if (trigger.includes('release')) return AVAILABLE_VARIABLES.new_release;
    return [];
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground">Manage email and SMS notifications</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="settings" className="gap-1.5 px-2 sm:px-3">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-1.5 px-2 sm:px-3">
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="sms" className="gap-1.5 px-2 sm:px-3">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">SMS</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 px-2 sm:px-3">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
          <TabsTrigger value="push" className="gap-1.5 px-2 sm:px-3">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Push</span>
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          {settings && (
            <>
              {/* Email Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Email Settings
                  </CardTitle>
                  <CardDescription>
                    Configure how email notifications are sent
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Requires SMTP configuration in environment variables
                      </p>
                    </div>
                    <Switch
                      checked={settings.email_enabled}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, email_enabled: checked })
                      }
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>From Name</Label>
                      <Input
                        value={settings.email_from_name}
                        onChange={(e) =>
                          setSettings({ ...settings, email_from_name: e.target.value })
                        }
                        placeholder="Enchanted Park Pickups"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>From Email</Label>
                      <Input
                        value={settings.email_from_address}
                        onChange={(e) =>
                          setSettings({ ...settings, email_from_address: e.target.value })
                        }
                        placeholder="hello@enchantedparkpickups.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Reply-To Email (optional)</Label>
                    <Input
                      value={settings.email_reply_to || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, email_reply_to: e.target.value || null })
                      }
                      placeholder="Same as from email if empty"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* SMS Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    SMS Settings
                  </CardTitle>
                  <CardDescription>
                    Configure how SMS notifications are sent via Twilio
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Requires Twilio configuration in environment variables
                      </p>
                    </div>
                    <Switch
                      checked={settings.sms_enabled}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, sms_enabled: checked })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>From Name (for message prefix)</Label>
                    <Input
                      value={settings.sms_from_name}
                      onChange={(e) =>
                        setSettings({ ...settings, sms_from_name: e.target.value })
                      }
                      placeholder="Enchanted Park"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Notification Triggers */}
              <Card>
                <CardHeader>
                  <CardTitle>Automatic Notifications</CardTitle>
                  <CardDescription>
                    Choose which events trigger notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Invoice Ready</Label>
                      <p className="text-sm text-muted-foreground">
                        Send when a new invoice is created
                      </p>
                    </div>
                    <Switch
                      checked={settings.send_invoice_notifications}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, send_invoice_notifications: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Order Shipped</Label>
                      <p className="text-sm text-muted-foreground">
                        Send when a shipping label is purchased
                      </p>
                    </div>
                    <Switch
                      checked={settings.send_shipping_notifications}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, send_shipping_notifications: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Order Delivered</Label>
                      <p className="text-sm text-muted-foreground">
                        Send when Shippo reports delivery
                      </p>
                    </div>
                    <Switch
                      checked={settings.send_delivery_notifications}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, send_delivery_notifications: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>New Release Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Send to customers with matching interests
                      </p>
                    </div>
                    <Switch
                      checked={settings.send_new_release_notifications}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, send_new_release_notifications: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={saveSettings} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* Email Templates Tab */}
        <TabsContent value="email" className="space-y-4">
          <div className="grid gap-4">
            {templates
              .filter((t) => t.type === 'email')
              .map((template) => (
                <Card key={template.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <Badge variant={template.enabled ? 'default' : 'secondary'}>
                          {template.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={template.enabled}
                          onCheckedChange={() => toggleTemplateEnabled(template)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => previewTemplate(template)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditTemplate(template);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTestTemplate(template);
                            setTestDialogOpen(true);
                          }}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      Trigger: {template.trigger.replace(/_/g, ' ')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm font-medium">Subject:</p>
                      <p className="text-sm text-muted-foreground">{template.email_subject}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* SMS Templates Tab */}
        <TabsContent value="sms" className="space-y-4">
          <div className="grid gap-4">
            {templates
              .filter((t) => t.type === 'sms')
              .map((template) => (
                <Card key={template.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <Badge variant={template.enabled ? 'default' : 'secondary'}>
                          {template.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={template.enabled}
                          onCheckedChange={() => toggleTemplateEnabled(template)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditTemplate(template);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTestTemplate(template);
                            setTestDialogOpen(true);
                          }}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      Trigger: {template.trigger.replace(/_/g, ' ')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm font-mono">{template.sms_body}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {(template.sms_body?.length || 0)} / 160 characters
                        {(template.sms_body?.length || 0) > 160 && (
                          <span className="text-yellow-500 ml-2">
                            (will be split into multiple messages)
                          </span>
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
              <CardDescription>Last 50 notifications sent</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No notifications sent yet
                </p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {log.type === 'email' ? (
                          <Mail className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <MessageSquare className="w-4 h-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-sm font-medium">
                            {log.subject || log.body?.slice(0, 50) + '...'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            To: {log.recipient}
                            {log.customer?.name && ` (${log.customer.name})`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            log.status === 'sent' || log.status === 'delivered'
                              ? 'default'
                              : log.status === 'failed'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {log.status === 'sent' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {log.status === 'failed' && <XCircle className="w-3 h-3 mr-1" />}
                          {log.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                          {log.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Push Notifications Tab */}
        <TabsContent value="push" className="space-y-6">
          {/* Push Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Push Notification Status
              </CardTitle>
              <CardDescription>
                Web Push notifications for real-time alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  {pushStatus?.enabled ? (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium text-sm sm:text-base">
                      {pushStatus?.enabled ? 'Push Enabled' : 'Push Disabled'}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {pushStatus?.enabled
                        ? 'VAPID keys configured'
                        : 'Set VAPID keys in environment'}
                    </p>
                  </div>
                </div>
                {pushStatus?.enabled && (
                  <Badge variant="default" className="w-fit">Active</Badge>
                )}
              </div>

              {!pushStatus?.enabled && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">Setup Required</p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        To enable push notifications, generate VAPID keys and add them to your environment:
                      </p>
                      <code className="block mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded text-xs">
                        npx web-push generate-vapid-keys
                      </code>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* This Browser */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                This Browser
              </CardTitle>
              <CardDescription>
                Subscribe this browser to receive admin notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {browserSubscribed ? (
                    <BellRing className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <Bell className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium">
                      {browserSubscribed ? 'Subscribed' : 'Not Subscribed'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {browserSubscribed
                        ? 'You will receive push notifications'
                        : 'Subscribe to receive real-time alerts'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 ml-8 sm:ml-0">
                  {browserSubscribed ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={unsubscribeBrowser}
                      disabled={pushSubscribing || !pushStatus?.enabled}
                    >
                      {pushSubscribing ? 'Processing...' : 'Unsubscribe'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={subscribeBrowser}
                      disabled={pushSubscribing || !pushStatus?.enabled}
                    >
                      <Bell className="w-4 h-4 mr-1.5" />
                      {pushSubscribing ? 'Subscribing...' : 'Subscribe'}
                    </Button>
                  )}
                </div>
              </div>

              {pushStatus?.enabled && (
                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={sendTestPush}
                    disabled={pushTesting || pushSubscriptions.length === 0}
                  >
                    <Send className="w-4 h-4 mr-1.5" />
                    {pushTesting ? 'Sending...' : 'Send Test'}
                  </Button>
                  {pushSubscriptions.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Subscribe first to send test notifications
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Subscriptions */}
          <Card>
            <CardHeader>
              <CardTitle>Active Subscriptions</CardTitle>
              <CardDescription>
                All devices registered for push notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pushSubscriptions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No active subscriptions
                </p>
              ) : (
                <div className="space-y-2">
                  {pushSubscriptions.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Smartphone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {sub.customer_id === 'admin'
                              ? 'Admin Browser'
                              : sub.customer?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {new Date(sub.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0"
                        onClick={() => deleteSubscription(sub)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Template Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template: {editTemplate?.name}</DialogTitle>
            <DialogDescription>
              Customize the notification content. Use {'{{variable}}'} syntax for dynamic content.
            </DialogDescription>
          </DialogHeader>

          {editTemplate && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={editTemplate.name}
                  onChange={(e) =>
                    setEditTemplate({ ...editTemplate, name: e.target.value })
                  }
                />
              </div>

              {editTemplate.type === 'email' && (
                <>
                  <div className="space-y-2">
                    <Label>Email Subject</Label>
                    <Input
                      value={editTemplate.email_subject || ''}
                      onChange={(e) =>
                        setEditTemplate({ ...editTemplate, email_subject: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email Body (HTML)</Label>
                    <Textarea
                      value={editTemplate.email_html || ''}
                      onChange={(e) =>
                        setEditTemplate({ ...editTemplate, email_html: e.target.value })
                      }
                      rows={15}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email Body (Plain Text)</Label>
                    <Textarea
                      value={editTemplate.email_text || ''}
                      onChange={(e) =>
                        setEditTemplate({ ...editTemplate, email_text: e.target.value })
                      }
                      rows={8}
                      className="font-mono text-sm"
                    />
                  </div>
                </>
              )}

              {editTemplate.type === 'sms' && (
                <div className="space-y-2">
                  <Label>SMS Message</Label>
                  <Textarea
                    value={editTemplate.sms_body || ''}
                    onChange={(e) =>
                      setEditTemplate({ ...editTemplate, sms_body: e.target.value })
                    }
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    {(editTemplate.sms_body?.length || 0)} / 160 characters
                    {(editTemplate.sms_body?.length || 0) > 160 && (
                      <span className="text-yellow-500 ml-2">
                        (will be split into multiple messages)
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Available Variables */}
              <div className="space-y-2">
                <Label>Available Variables</Label>
                <div className="bg-muted p-3 rounded-lg">
                  <div className="grid gap-2 md:grid-cols-2">
                    {getTriggerVariables(editTemplate.trigger).map((v) => (
                      <div key={v.name} className="text-sm">
                        <code className="bg-background px-1 rounded">
                          {`{{${v.name}}}`}
                        </code>
                        <span className="text-muted-foreground ml-2">{v.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTemplate} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            <iframe
              srcDoc={previewHtml}
              className="w-full h-[500px]"
              title="Email Preview"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Send Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Notification</DialogTitle>
            <DialogDescription>
              Send a test {testTemplate?.type} using sample data
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {testTemplate?.type === 'email' ? (
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            )}

            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                Test notifications use sample data and are logged for verification.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendTestNotification} disabled={testSending}>
              <Send className="w-4 h-4 mr-2" />
              {testSending ? 'Sending...' : 'Send Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
