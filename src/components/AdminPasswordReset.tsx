import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserRow {
  user_id: string;
  full_name: string;
  email: string;
}

const AdminPasswordReset = () => {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filter, setFilter] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .order('full_name', { ascending: true })
      .then(({ data }) => {
        if (data) setUsers(data as UserRow[]);
      });
  }, [open]);

  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(filter.toLowerCase()) ||
      u.email.toLowerCase().includes(filter.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!selectedUserId) {
      toast.error('Select a user');
      return;
    }
    const checks = [
      { ok: newPassword.length >= 8, msg: 'at least 8 characters' },
      { ok: /[a-z]/.test(newPassword), msg: 'a lowercase letter' },
      { ok: /[A-Z]/.test(newPassword), msg: 'an uppercase letter' },
      { ok: /[0-9]/.test(newPassword), msg: 'a number' },
      { ok: /[!@#$%^&*()_+\-=\[\]{};':"|<>?,./`~\\]/.test(newPassword), msg: 'a symbol' },
    ];
    const failed = checks.filter((c) => !c.ok).map((c) => c.msg);
    if (failed.length) {
      toast.error(`Password must include: ${failed.join(', ')}`);
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke('admin-reset-password', {
      body: { target_user_id: selectedUserId, new_password: newPassword },
    });
    setSubmitting(false);
    if (error || (data && (data as any).error)) {
      toast.error(error?.message || (data as any)?.error || 'Failed to reset password');
      return;
    }
    toast.success('Password reset successfully. Please share it with the user securely.');
    setNewPassword('');
    setSelectedUserId('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <KeyRound className="w-4 h-4" />
          Reset User Password
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reset a user's password</DialogTitle>
          <DialogDescription>
            Set a new password for any user without sending a recovery email. This action is logged
            in the audit trail.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Search user</Label>
            <Input
              placeholder="Search by name or email"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>User</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {filtered.slice(0, 100).map((u) => (
                  <SelectItem key={u.user_id} value={u.user_id}>
                    {u.full_name} — {u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>New password</Label>
            <Input
              type="text"
              placeholder="e.g. Reading2026!"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Must include uppercase, lowercase, number, and symbol (min 8 chars). Share via a secure channel.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Reset password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminPasswordReset;
