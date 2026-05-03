import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;
  is_approved: boolean;
  is_admin: boolean;
}

const Admin = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, full_name, created_at, is_approved")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);

    if (pErr || rErr) {
      toast({
        title: "Failed to load users",
        description: pErr?.message || rErr?.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const adminIds = new Set(
      (roles || []).filter((r) => r.role === "admin").map((r) => r.user_id)
    );
    setUsers(
      (profiles || []).map((p) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        created_at: p.created_at,
        is_approved: !!p.is_approved,
        is_admin: adminIds.has(p.id),
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleApproved = async (user: AdminUser, value: boolean) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, is_approved: value } : u))
    );
    const { error } = await supabase
      .from("profiles")
      .update({ is_approved: value })
      .eq("id", user.id);
    if (error) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
      fetchUsers();
    }
  };

  const toggleAdmin = async (user: AdminUser, value: boolean) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, is_admin: value } : u))
    );
    const { error } = value
      ? await supabase.from("user_roles").insert({ user_id: user.id, role: "admin" })
      : await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", user.id)
          .eq("role", "admin");
    if (error) {
      toast({
        title: "Role update failed",
        description: error.message,
        variant: "destructive",
      });
      fetchUsers();
    }
  };

  const filtered = users.filter((u) =>
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="text-muted-foreground">Manage user access and roles.</p>
      </div>

      <Input
        placeholder="Search by email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-center">Approved</TableHead>
              <TableHead className="text-center">Admin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>{u.full_name || "—"}</TableCell>
                  <TableCell>
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={u.is_approved}
                      onCheckedChange={(v) => toggleApproved(u, v)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={u.is_admin}
                      onCheckedChange={(v) => toggleAdmin(u, v)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Admin;