import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import AdminLayoutClient from './AdminLayoutClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EPP Admin',
  manifest: '/manifest-admin.json',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirect=/admin');
  }

  // Verify admin_users membership
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id, name, email, role')
    .eq('id', user.id)
    .single();

  if (!adminUser) {
    redirect('/auth/login?error=unauthorized');
  }

  return (
    <AdminLayoutClient user={adminUser as { id: string; name: string; email: string; role: 'admin' | 'manager' | 'shopper' }}>
      {children}
    </AdminLayoutClient>
  );
}
