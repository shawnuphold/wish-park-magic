import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  LogIn,
  Plus,
  Search,
  Loader2,
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Calendar,
  MapPin,
  Phone,
  User,
  Package,
  ExternalLink,
} from 'lucide-react';
import { z } from 'zod';
import { apiEndpoints, apiRequest, RequestDetails } from '@/lib/api';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const lookupSchema = z.object({
  email: z.string().email('Invalid email address'),
  requestId: z.string().min(1, 'Request ID is required'),
});

interface UserSession {
  isLoggedIn: boolean;
  email?: string;
  name?: string;
}

export default function PortalPage() {
  const [session, setSession] = useState<UserSession>({ isLoggedIn: false });
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<RequestDetails[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestDetails | null>(null);
  
  // Login form state
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Lookup modal state
  const [lookupModalOpen, setLookupModalOpen] = useState(false);
  const [lookupStep, setLookupStep] = useState<'email' | 'code' | 'details'>('email');
  const [lookupData, setLookupData] = useState({ email: '', requestId: '', code: '' });
  const [lookupErrors, setLookupErrors] = useState<Record<string, string>>({});
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<RequestDetails | null>(null);

  // Check if user is logged in on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest<{ requests: RequestDetails[] }>(apiEndpoints.getMyRequests);
      if (response.success && response.data) {
        setSession({ isLoggedIn: true });
        setRequests(response.data.requests || []);
      }
    } catch {
      // Not logged in
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrors({});

    const result = loginSchema.safeParse(loginData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setLoginErrors(fieldErrors);
      return;
    }

    setIsLoggingIn(true);
    
    // In a real implementation, this would call a login endpoint
    // For now, we'll simulate checking the session after "login"
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const response = await apiRequest<{ requests: RequestDetails[] }>(apiEndpoints.getMyRequests);
      if (response.success && response.data) {
        setSession({ isLoggedIn: true, email: loginData.email });
        setRequests(response.data.requests || []);
        toast.success('Logged in successfully!');
      } else {
        toast.error('Invalid credentials. Please try again.');
      }
    } catch {
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLookupSendCode = async () => {
    setLookupErrors({});

    const result = lookupSchema.safeParse(lookupData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setLookupErrors(fieldErrors);
      return;
    }

    setIsLookingUp(true);
    try {
      const response = await apiRequest(apiEndpoints.sendLookupCode, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: lookupData.email,
          request_id: lookupData.requestId,
        }),
      });

      if (response.success) {
        setLookupStep('code');
        toast.success('Verification code sent to your email!');
      } else {
        toast.error(response.error || 'Failed to send code. Please check your email and request ID.');
      }
    } catch {
      toast.error('Failed to send verification code.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleLookupVerifyCode = async () => {
    if (!lookupData.code || lookupData.code.length < 4) {
      setLookupErrors({ code: 'Please enter the verification code' });
      return;
    }

    setIsLookingUp(true);
    try {
      const response = await apiRequest<RequestDetails>(apiEndpoints.verifyLookupCode, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: lookupData.email,
          request_id: lookupData.requestId,
          code: lookupData.code,
        }),
      });

      if (response.success && response.data) {
        setLookupResult(response.data);
        setLookupStep('details');
      } else {
        toast.error(response.error || 'Invalid verification code.');
      }
    } catch {
      toast.error('Failed to verify code.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const closeLookupModal = () => {
    setLookupModalOpen(false);
    setLookupStep('email');
    setLookupData({ email: '', requestId: '', code: '' });
    setLookupErrors({});
    setLookupResult(null);
  };

  const fetchRequestDetails = async (id: string) => {
    try {
      const response = await apiRequest<RequestDetails>(apiEndpoints.getRequest(id));
      if (response.success && response.data) {
        setSelectedRequest(response.data);
      } else {
        toast.error('Failed to load request details.');
      }
    } catch {
      toast.error('Failed to load request details.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getParkName = (park: string) => {
    switch (park.toLowerCase()) {
      case 'disney':
        return 'Disney World';
      case 'universal':
        return 'Universal Orlando';
      case 'seaworld':
        return 'SeaWorld';
      default:
        return park;
    }
  };

  if (isLoading) {
    return (
      <main className="pt-20 min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </main>
    );
  }

  // Logged Out State
  if (!session.isLoggedIn) {
    return (
      <main className="pt-20 min-h-screen bg-background">
        {/* Hero */}
        <section className="bg-magic py-16">
          <div className="container-wide text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4">
                Client Portal
              </h1>
              <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
                Track your requests and manage your orders
              </p>
            </motion.div>
          </div>
        </section>

        {/* Login Form */}
        <section className="section-padding">
          <div className="container-tight">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="max-w-md mx-auto"
            >
              <div className="bg-card rounded-2xl p-8 shadow-card border border-border/50">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
                    <LogIn className="w-8 h-8 text-gold" />
                  </div>
                  <h2 className="font-heading text-2xl font-bold text-foreground">
                    Sign In
                  </h2>
                  <p className="text-muted-foreground text-sm mt-2">
                    Access your dashboard and track requests
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        placeholder="your@email.com"
                        className={`pl-10 ${loginErrors.email ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {loginErrors.email && (
                      <p className="text-sm text-destructive">{loginErrors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        placeholder="••••••••"
                        className={`pl-10 pr-10 ${loginErrors.password ? 'border-destructive' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {loginErrors.password && (
                      <p className="text-sm text-destructive">{loginErrors.password}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="gold"
                    size="lg"
                    className="w-full"
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <button
                  onClick={() => setLookupModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 text-gold hover:text-gold-dark transition-colors"
                >
                  <Search className="w-4 h-4" />
                  <span className="text-sm font-medium">Lookup a Request without login</span>
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Lookup Modal */}
        <Dialog open={lookupModalOpen} onOpenChange={closeLookupModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">
                {lookupStep === 'email' && 'Lookup Your Request'}
                {lookupStep === 'code' && 'Enter Verification Code'}
                {lookupStep === 'details' && 'Request Details'}
              </DialogTitle>
              <DialogDescription>
                {lookupStep === 'email' && 'Enter your email and request ID to get started'}
                {lookupStep === 'code' && 'We sent a code to your email'}
                {lookupStep === 'details' && ''}
              </DialogDescription>
            </DialogHeader>

            {lookupStep === 'email' && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="lookupEmail">Email</Label>
                  <Input
                    id="lookupEmail"
                    type="email"
                    value={lookupData.email}
                    onChange={(e) => setLookupData({ ...lookupData, email: e.target.value })}
                    placeholder="your@email.com"
                    className={lookupErrors.email ? 'border-destructive' : ''}
                  />
                  {lookupErrors.email && (
                    <p className="text-sm text-destructive">{lookupErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lookupRequestId">Request ID</Label>
                  <Input
                    id="lookupRequestId"
                    value={lookupData.requestId}
                    onChange={(e) => setLookupData({ ...lookupData, requestId: e.target.value })}
                    placeholder="e.g., REQ-12345"
                    className={lookupErrors.requestId ? 'border-destructive' : ''}
                  />
                  {lookupErrors.requestId && (
                    <p className="text-sm text-destructive">{lookupErrors.requestId}</p>
                  )}
                </div>

                <Button
                  onClick={handleLookupSendCode}
                  variant="gold"
                  className="w-full"
                  disabled={isLookingUp}
                >
                  {isLookingUp ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Verification Code'
                  )}
                </Button>
              </div>
            )}

            {lookupStep === 'code' && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="verificationCode">Verification Code</Label>
                  <Input
                    id="verificationCode"
                    value={lookupData.code}
                    onChange={(e) => setLookupData({ ...lookupData, code: e.target.value })}
                    placeholder="Enter the code from your email"
                    className={lookupErrors.code ? 'border-destructive' : ''}
                  />
                  {lookupErrors.code && (
                    <p className="text-sm text-destructive">{lookupErrors.code}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setLookupStep('email')}
                    variant="outline"
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleLookupVerifyCode}
                    variant="gold"
                    className="flex-1"
                    disabled={isLookingUp}
                  >
                    {isLookingUp ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Verify'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {lookupStep === 'details' && lookupResult && (
              <RequestDetailsView request={lookupResult} />
            )}
          </DialogContent>
        </Dialog>
      </main>
    );
  }

  // Logged In State - Dashboard
  return (
    <main className="pt-20 min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-magic py-12">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
                Welcome Back!
              </h1>
              <p className="text-primary-foreground/80">
                {session.email || 'Manage your requests and orders'}
              </p>
            </div>
            <Button variant="gold" asChild>
              <Link to="/request">
                <Plus className="w-4 h-4 mr-2" />
                Create New Request
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Dashboard Content */}
      <section className="section-padding">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="font-heading text-2xl font-bold text-foreground mb-6">
              Your Requests
            </h2>

            {requests.length === 0 ? (
              <div className="bg-card rounded-2xl p-12 text-center shadow-card border border-border/50">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
                  No requests yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  Start by creating your first request
                </p>
                <Button variant="gold" asChild>
                  <Link to="/request">Create a Request</Link>
                </Button>
              </div>
            ) : (
              <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Park</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Needed By</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow
                        key={request.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => fetchRequestDetails(request.id)}
                      >
                        <TableCell className="font-mono font-medium">
                          {request.id}
                        </TableCell>
                        <TableCell>{formatDate(request.date)}</TableCell>
                        <TableCell>{getParkName(request.park)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(request.status)}>
                            {request.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {request.needed_by ? formatDate(request.needed_by) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Request Details Modal */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              Request Details
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && <RequestDetailsView request={selectedRequest} />}
        </DialogContent>
      </Dialog>
    </main>
  );
}

// Request Details Component
function RequestDetailsView({ request }: { request: RequestDetails }) {
  const getParkName = (park: string) => {
    switch (park.toLowerCase()) {
      case 'disney':
        return 'Disney World';
      case 'universal':
        return 'Universal Orlando';
      case 'seaworld':
        return 'SeaWorld';
      default:
        return park;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6 py-4">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Request ID</p>
          <p className="font-mono font-semibold text-foreground">{request.id}</p>
        </div>
        <Badge className={getStatusColor(request.status)}>
          {request.status.replace('_', ' ')}
        </Badge>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-start gap-3">
          <User className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="text-foreground">{request.full_name}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="text-foreground">{request.email}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="text-foreground">{request.phone}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground">Park</p>
            <p className="text-foreground">{getParkName(request.park)}</p>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-start gap-3">
          <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground">Submitted</p>
            <p className="text-foreground">{formatDate(request.date)}</p>
          </div>
        </div>
        {request.needed_by && (
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-gold mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Needed By</p>
              <p className="text-gold font-medium">{formatDate(request.needed_by)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Shipping Address */}
      <div>
        <p className="text-sm text-muted-foreground mb-1">Shipping Address</p>
        <p className="text-foreground bg-secondary p-3 rounded-lg">{request.shipping_address}</p>
      </div>

      {/* Item Description */}
      <div>
        <p className="text-sm text-muted-foreground mb-1">Item Description</p>
        <p className="text-foreground bg-secondary p-3 rounded-lg whitespace-pre-wrap">
          {request.item_description}
        </p>
      </div>

      {/* Reference URLs */}
      {request.reference_urls && (
        <div>
          <p className="text-sm text-muted-foreground mb-1">Reference URLs</p>
          <div className="bg-secondary p-3 rounded-lg space-y-1">
            {request.reference_urls.split('\n').map((url, index) => (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-gold hover:underline text-sm"
              >
                <ExternalLink className="w-3 h-3" />
                {url}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Images */}
      {request.images && request.images.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Reference Images</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {request.images.map((image, index) => (
              <a
                key={index}
                href={image}
                target="_blank"
                rel="noopener noreferrer"
                className="aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity"
              >
                <img
                  src={image}
                  alt={`Reference ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
