'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, X, Star, Link2 } from 'lucide-react';

interface Alias {
  id: string;
  customer_id: string;
  alias_type: 'facebook' | 'instagram' | 'telegram' | 'email' | 'phone' | 'other';
  alias_value: string;
  is_primary: boolean;
  created_at: string;
}

interface AliasManagerProps {
  customerId: string;
}

const ALIAS_TYPES = [
  { value: 'facebook', label: 'Facebook', icon: '📘' },
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'telegram', label: 'Telegram', icon: '✈️' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'phone', label: 'Phone', icon: '📱' },
  { value: 'other', label: 'Other', icon: '🔗' },
];

export function AliasManager({ customerId }: AliasManagerProps) {
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAliasType, setNewAliasType] = useState<string>('facebook');
  const [newAliasValue, setNewAliasValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteAlias, setDeleteAlias] = useState<Alias | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAliases();
  }, [customerId]);

  const fetchAliases = async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}/aliases`);
      const data = await res.json();
      setAliases(data.aliases || []);
    } catch (error) {
      console.error('Error fetching aliases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAlias = async () => {
    if (!newAliasValue.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/aliases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alias_type: newAliasType,
          alias_value: newAliasValue.trim(),
          is_primary: false,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add alias');
      }

      toast({ title: 'Alias added successfully' });
      setNewAliasValue('');
      setShowAddForm(false);
      fetchAliases();
    } catch (error) {
      toast({
        title: 'Error adding alias',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAlias = async () => {
    if (!deleteAlias) return;

    try {
      const res = await fetch(`/api/customers/${customerId}/aliases/${deleteAlias.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete alias');

      toast({ title: 'Alias removed' });
      setDeleteAlias(null);
      fetchAliases();
    } catch (error) {
      toast({
        title: 'Error removing alias',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleSetPrimary = async (alias: Alias) => {
    try {
      const res = await fetch(`/api/customers/${customerId}/aliases/${alias.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_primary: true }),
      });

      if (!res.ok) throw new Error('Failed to set primary');

      toast({ title: 'Primary alias updated' });
      fetchAliases();
    } catch (error) {
      toast({
        title: 'Error updating alias',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  // Group aliases by type
  const groupedAliases = ALIAS_TYPES.reduce((acc, type) => {
    acc[type.value] = aliases.filter(a => a.alias_type === type.value);
    return acc;
  }, {} as Record<string, Alias[]>);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Linked Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Linked Accounts
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Alias
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add form */}
          {showAddForm && (
            <div className="flex gap-2 p-3 bg-muted rounded-lg">
              <Select value={newAliasType} onValueChange={setNewAliasType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALIAS_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Enter alias value..."
                value={newAliasValue}
                onChange={(e) => setNewAliasValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddAlias()}
                className="flex-1"
              />
              <Button onClick={handleAddAlias} disabled={submitting || !newAliasValue.trim()}>
                Add
              </Button>
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Grouped aliases */}
          {aliases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No linked accounts yet.</p>
          ) : (
            <div className="space-y-3">
              {ALIAS_TYPES.map(type => {
                const typeAliases = groupedAliases[type.value];
                if (!typeAliases || typeAliases.length === 0) return null;

                return (
                  <div key={type.value}>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      {type.icon} {type.label}
                    </div>
                    <div className="space-y-1">
                      {typeAliases.map(alias => (
                        <div
                          key={alias.id}
                          className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted group"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{alias.alias_value}</span>
                            {alias.is_primary && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="h-3 w-3 mr-1 fill-current" />
                                Primary
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!alias.is_primary && type.value === 'facebook' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetPrimary(alias)}
                                title="Set as primary"
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteAlias(alias)}
                              className="text-destructive hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteAlias} onOpenChange={() => setDeleteAlias(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Alias</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &quot;{deleteAlias?.alias_value}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAlias} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
