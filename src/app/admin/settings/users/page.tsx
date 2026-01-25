"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Users, Mail, ArrowLeft, UserPlus } from 'lucide-react';
import Link from 'next/link';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'shopper';
  created_at: string;
  updated_at: string;
}

type UserRole = 'admin' | 'manager' | 'shopper';

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  shopper: 'Shopper',
};

const roleColors: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  shopper: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

export default function UsersSettingsPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('shopper');

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('shopper');

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load admin users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim() || !inviteName.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', inviteEmail.toLowerCase().trim())
        .single();

      if (existingUser) {
        toast({
          title: 'Error',
          description: 'A user with this email already exists',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      // Insert new admin user
      const { error } = await supabase
        .from('admin_users')
        .insert({
          email: inviteEmail.toLowerCase().trim(),
          name: inviteName.trim(),
          role: inviteRole,
        });

      if (error) throw error;

      toast({
        title: 'User Added',
        description: `${inviteName} has been added as a ${roleLabels[inviteRole]}`,
      });

      // Reset form and close modal
      setInviteEmail('');
      setInviteName('');
      setInviteRole('shopper');
      setShowInviteModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Error adding user:', error);
      toast({
        title: 'Error',
        description: 'Failed to add user',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = async () => {
    if (!editingUser || !editName.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({
          name: editName.trim(),
          role: editRole,
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast({
        title: 'User Updated',
        description: `${editName} has been updated`,
      });

      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', deletingUser.id);

      if (error) throw error;

      toast({
        title: 'User Deleted',
        description: `${deletingUser.name} has been removed`,
      });

      setShowDeleteModal(false);
      setDeletingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setShowEditModal(true);
  };

  const openDeleteModal = (user: AdminUser) => {
    setDeletingUser(user);
    setShowDeleteModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-heading font-bold text-foreground">Admin Users</h1>
          <p className="text-muted-foreground">Manage team members who can access the admin panel</p>
        </div>
        <Button variant="gold" onClick={() => setShowInviteModal(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Members
          </CardTitle>
          <CardDescription>
            {users.length} user{users.length !== 1 ? 's' : ''} with admin access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No admin users found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowInviteModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First User
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={roleColors[user.role]} variant="secondary">
                        {roleLabels[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(user)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => openDeleteModal(user)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Role Descriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>Understanding what each role can do</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
              <Badge className={roleColors.admin} variant="secondary">Admin</Badge>
              <p className="mt-2 text-sm text-muted-foreground">
                Full access to all features including user management, settings, and financial data.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
              <Badge className={roleColors.manager} variant="secondary">Manager</Badge>
              <p className="mt-2 text-sm text-muted-foreground">
                Can manage requests, invoices, customers, and trips. Cannot manage users or core settings.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
              <Badge className={roleColors.shopper} variant="secondary">Shopper</Badge>
              <p className="mt-2 text-sm text-muted-foreground">
                Can view and update assigned trips, mark items as picked up, and add photos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invite User Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Add a new team member to access the admin panel
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Name</Label>
              <Input
                id="invite-name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="shopper">Shopper</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteModal(false)}>
              Cancel
            </Button>
            <Button variant="gold" onClick={handleInviteUser} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information for {editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="shopper">Shopper</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button variant="gold" onClick={handleEditUser} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deletingUser?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
