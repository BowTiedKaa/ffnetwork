import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserCog } from "lucide-react";

export const ProfileSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agency, setAgency] = useState("");
  const [years, setYears] = useState("");
  const [target, setTarget] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("agency, years_of_service, target_role_seeking")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setAgency(data.agency || "");
        setYears(data.years_of_service || "");
        setTarget(data.target_role_seeking || "");
      }
      setLoading(false);
    };
    load();
  }, []);

  const save = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        agency: agency || null,
        years_of_service: years || null,
        target_role_seeking: target || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Your profile has been updated." });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5" /> Your Background
        </CardTitle>
        <CardDescription>
          Used to personalize outreach messages and AI drafts. Fill this in once.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="agency">Federal agency</Label>
            <Input id="agency" placeholder="e.g. DHS" value={agency} onChange={(e) => setAgency(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="years">Years of service</Label>
            <Input id="years" placeholder="e.g. 8" value={years} onChange={(e) => setYears(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target">Target role</Label>
            <Input id="target" placeholder="e.g. Business Development" value={target} onChange={(e) => setTarget(e.target.value)} disabled={loading} />
          </div>
        </div>
        <Button onClick={save} disabled={saving || loading}>
          {saving ? "Saving…" : "Save background"}
        </Button>
      </CardContent>
    </Card>
  );
};