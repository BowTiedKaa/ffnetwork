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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Plus } from "lucide-react";
import { format } from "date-fns";
import { SEO } from "@/components/SEO";

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

  // Codes state
  const [codes, setCodes] = useState<any[]>([]);
  const [codesLoading, setCodesLoading] = useState(true);
  const [genOpen, setGenOpen] = useState(false);
  const [genDuration, setGenDuration] = useState<"1" | "6" | "12" | "36">("1");
  const [genCount, setGenCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<string[]>([]);
  const [usedByMap, setUsedByMap] = useState<Record<string, string>>({});

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
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    setCodesLoading(true);
    const { data, error } = await supabase
      .from("access_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load codes", description: error.message, variant: "destructive" });
      setCodesLoading(false);
      return;
    }
    setCodes(data || []);
    // Look up emails for used codes
    const userIds = Array.from(new Set((data || []).map((c) => c.used_by).filter(Boolean))) as string[];
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", userIds);
      const map: Record<string, string> = {};
      (profs || []).forEach((p) => { map[p.id] = p.email || ""; });
      setUsedByMap(map);
    }
    setCodesLoading(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerated([]);
    const { data, error } = await supabase.rpc("generate_access_codes", {
      _count: genCount,
      _duration_months: parseInt(genDuration),
    });
    setGenerating(false);
    if (error) {
      toast({ title: "Failed to generate codes", description: error.message, variant: "destructive" });
      return;
    }
    const list = (data as string[]) || [];
    setGenerated(list);
    fetchCodes();
  };

  const toggleCodeActive = async (id: string, value: boolean) => {
    setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: value } : c)));
    const { error } = await supabase.from("access_codes").update({ is_active: value }).eq("id", id);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      fetchCodes();
    }
  };

  const codeStatus = (c: any): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } => {
    if (!c.is_active) return { label: "inactive", variant: "destructive" };
    if (c.used_by) return { label: "used", variant: "secondary" };
    return { label: "unused", variant: "outline" };
  };

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
      <SEO
        title="Admin — FF Network"
        description="Internal admin tools for FF Network: manage user approvals, roles, and Pro access codes."
        path="/admin"
        noindex
      />
      <div>
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="text-muted-foreground">Manage users, roles, and access codes.</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="codes">Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4 mt-4">
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
        </TabsContent>

        <TabsContent value="codes" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => { setGenerated([]); setGenOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Generate Codes
            </Button>
          </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Used by</TableHead>
                  <TableHead>Date used</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codesLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                ) : codes.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No codes yet.</TableCell></TableRow>
                ) : codes.map((c) => {
                  const s = codeStatus(c);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono">{c.code}</TableCell>
                      <TableCell>{c.duration_months} mo</TableCell>
                      <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                      <TableCell className="text-sm">{c.used_by ? (usedByMap[c.used_by] || c.used_by) : "—"}</TableCell>
                      <TableCell className="text-sm">{c.used_at ? format(new Date(c.used_at), "MMM d, yyyy") : "—"}</TableCell>
                      <TableCell className="text-center">
                        <Switch checked={c.is_active} onCheckedChange={(v) => toggleCodeActive(c.id, v)} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Access Codes</DialogTitle>
          </DialogHeader>
          {generated.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Generated {generated.length} codes. Copy them now:</p>
              <div className="border rounded-md bg-muted/40 p-3 font-mono text-sm space-y-1 max-h-64 overflow-auto">
                {generated.map((c) => <div key={c}>{c}</div>)}
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(generated.join("\n"));
                    toast({ title: "Copied", description: "All codes copied to clipboard." });
                  }}
                >
                  <Copy className="h-4 w-4" /> Copy All
                </Button>
                <Button onClick={() => { setGenOpen(false); setGenerated([]); }}>Done</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Duration</Label>
                <select
                  value={genDuration}
                  onChange={(e) => setGenDuration(e.target.value as "1" | "6" | "12" | "36")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="1">1 month</option>
                  <option value="6">6 months</option>
                  <option value="12">12 months</option>
                  <option value="36">3 years (Gumroad "Be More Earn More")</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Number of codes (1-50)</Label>
                <Input
                  type="number" min={1} max={50}
                  value={genCount}
                  onChange={(e) => setGenCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                />
              </div>
              <Button onClick={handleGenerate} disabled={generating} className="w-full">
                {generating ? "Generating…" : "Generate"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;