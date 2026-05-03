import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PitchBuilder = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [agency, setAgency] = useState("");
  const [years, setYears] = useState("");
  const [achievement, setAchievement] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [transitionReason, setTransitionReason] = useState("");
  const [pitch, setPitch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("profiles")
        .select("agency, years_of_service, target_role_seeking, pitch")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setAgency(data.agency ?? "");
        setYears(data.years_of_service ?? "");
        setTargetRole(data.target_role_seeking ?? "");
        setPitch((data as any).pitch ?? "");
      }
    })();
  }, []);

  const canGenerate = agency.trim().length > 0 && achievement.trim().length > 0 && !loading;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-pitch", {
        body: {
          agency, yearsOfService: years, achievement,
          targetRole, targetCompany, transitionReason,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const newPitch = (data as any)?.pitch || "";
      setPitch(newPitch);
      if (userId && newPitch) {
        await supabase.from("profiles").update({ pitch: newPitch } as any).eq("id", userId);
      }
      toast.success("Pitch generated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate pitch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pitch Builder</h1>
        <p className="text-muted-foreground">Build the pitch you'll use in every conversation.</p>
      </div>

      <Card className="p-6 bg-amber-50 border-amber-200">
        <h2 className="text-lg font-semibold text-amber-900">The 4-Sentence Formula</h2>
        <ol className="mt-3 space-y-2 text-sm text-amber-900 list-decimal list-inside">
          <li><span className="font-semibold">Federal achievement:</span> Specific, quantified, zero jargon — no acronyms, no agency titles</li>
          <li><span className="font-semibold">Target role:</span> Name the exact role and connect it to your fed skill</li>
          <li><span className="font-semibold">Transition reason:</span> Revenue-focused — not "new challenges" or "passion"</li>
          <li><span className="font-semibold">Value statement:</span> What you bring to their bottom line specifically</li>
        </ol>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="agency">Agency</Label>
            <Input id="agency" value={agency} onChange={(e) => setAgency(e.target.value)} placeholder="DHS" />
          </div>
          <div>
            <Label htmlFor="years">Years of service</Label>
            <Input id="years" value={years} onChange={(e) => setYears(e.target.value)} placeholder="8" />
          </div>
        </div>
        <div>
          <Label htmlFor="achievement">Core achievement — quantified</Label>
          <Textarea id="achievement" value={achievement} onChange={(e) => setAchievement(e.target.value)}
            placeholder="Managed $3M in contracts across 12 vendors, cut processing time 20%" rows={2} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="role">Target role</Label>
            <Input id="role" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="Business Development" />
          </div>
          <div>
            <Label htmlFor="company">Target company or company type</Label>
            <Input id="company" value={targetCompany} onChange={(e) => setTargetCompany(e.target.value)} placeholder="Palantir, AI defense startups" />
          </div>
        </div>
        <div>
          <Label htmlFor="reason">Why you're making the move — be direct</Label>
          <Textarea id="reason" value={transitionReason} onChange={(e) => setTransitionReason(e.target.value)}
            placeholder="I want my work tied directly to revenue and to get paid accordingly" rows={2} />
        </div>
        <Button onClick={handleGenerate} disabled={!canGenerate} className="w-full gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate My Pitch
        </Button>
      </Card>

      {pitch && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h2 className="text-lg font-semibold text-blue-900">Your 30-Second Pitch</h2>
          <p className="mt-3 text-blue-950 whitespace-pre-wrap leading-relaxed">{pitch}</p>
          <p className="mt-4 text-xs text-blue-800 italic">
            Practice this 10 times out loud. Time it. Test it on a Trailblazer first.
          </p>
        </Card>
      )}
    </div>
  );
};

export default PitchBuilder;