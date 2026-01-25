"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, ArrowLeft, CheckCircle2, KeyRound, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setValidSession(true);
      } else {
        setError('Invalid or expired reset link. Please request a new password reset.');
      }
      setChecking(false);
    };

    // Listen for auth state changes (when Supabase processes the recovery token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidSession(true);
        setChecking(false);
      }
    });

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Sign out after password reset
    await supabase.auth.signOut();
    setSuccess(true);
    setLoading(false);
  };

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-midnight to-midnight-light p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-gold mb-4" />
            <p className="text-muted-foreground">Verifying reset link...</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-midnight to-midnight-light p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-gold" />
            <span className="font-heading text-2xl font-bold text-foreground">Admin Portal</span>
          </div>
          <CardTitle className="text-xl">
            {success ? 'Password Updated' : 'Set New Password'}
          </CardTitle>
          <CardDescription>
            {success
              ? 'Your password has been successfully reset'
              : 'Enter your new password below'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Your password has been updated. You can now sign in with your new password.
                </p>
              </div>
              <Link href="/auth/login" className="block">
                <Button variant="gold" className="w-full">
                  Sign In
                </Button>
              </Link>
            </div>
          ) : !validSession ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                <p className="text-sm text-destructive font-medium mb-2">
                  Invalid Reset Link
                </p>
                <p className="text-sm text-muted-foreground">
                  {error || 'This password reset link is invalid or has expired.'}
                </p>
              </div>
              <Link href="/auth/forgot-password" className="block">
                <Button variant="gold" className="w-full">
                  Request New Reset Link
                </Button>
              </Link>
              <Link href="/auth/login" className="block">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoFocus
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={8}
                />
              </div>
              <Button type="submit" variant="gold" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 mr-2" />
                    Update Password
                  </>
                )}
              </Button>
              <Link href="/auth/login" className="block">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to login
                </Button>
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
