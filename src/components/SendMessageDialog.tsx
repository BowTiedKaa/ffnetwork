import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, Copy, Sparkles, Lock } from "lucide-react";
import { useUserAccess } from "@/hooks/useUserAccess";
import { RedeemCodeDialog } from "@/components/RedeemCodeDialog";

interface SendMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  contactEmail?: string | null;
  companyName?: string | null;
  contactType?: "connector" | "trailblazer" | "reliable_recruiter" | "unspecified" | null;
  targetRole?: string | null;
  contactNotes?: string | null;
}

export const SendMessageDialog = ({
  open,
  onOpenChange,
  contactName,
  contactEmail,
  companyName,
  contactType = "unspecified",
  targetRole,
  contactNotes,
}: SendMessageDialogProps) => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const { isPro } = useUserAccess(userId);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [profile, setProfile] = useState<{ agency: string; years_of_service: string; target_role_seeking: string }>({
    agency: "",
    years_of_service: "",
    target_role_seeking: "",
  });
  const [aiLoading, setAiLoading] = useState(false);

  // Load user background once when dialog opens
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("profiles")
        .select("agency, years_of_service, target_role_seeking")
        .eq("id", user.id)
        .maybeSingle();
      setProfile({
        agency: data?.agency || "",
        years_of_service: data?.years_of_service || "",
        target_role_seeking: data?.target_role_seeking || "",
      });
    })();
  }, [open]);

  const getMessageTemplate = () => {
    const firstName = contactName.split(" ")[0] || "there";
    const years = profile.years_of_service || "[years]";
    const agency = profile.agency || "[agency]";
    const target = profile.target_role_seeking || "[target role]";
    const company = companyName || "your company";

    switch (contactType) {
      case "connector":
        return `Hi ${firstName}, I came across your profile and noticed your connection to ${company}. I've spent ${years} years at ${agency} and I'm targeting ${target} in tech. Would you be open to a 15-minute call? I'd love your perspective on where someone with my background fits and whether you'd be open to any introductions. Best,`;

      case "trailblazer":
        return `Hi ${firstName}, I saw your background at ${company} and wanted to connect. I've spent ${years} years at ${agency} focused on [initiative]. I'm now targeting ${target} in tech. Would you be open to a 15-minute call? I'd like to hear how you navigated the transition and what you'd do differently. Best,`;

      case "reliable_recruiter":
        return `Hi ${firstName}, I'm a federal employee with ${years} years at ${agency} transitioning into ${target} in tech. Would you have 15 minutes to discuss what your clients are looking for right now? I'd value your perspective on how to position my background. Best,`;

      default:
        return `Hi ${firstName}, I've spent ${years} years at ${agency} and I'm targeting ${target} in tech. Would you be open to a 15-minute call? Best,`;
    }
  };

  const [message, setMessage] = useState("");

  useEffect(() => {
    setMessage(getMessageTemplate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactName, companyName, contactType, targetRole, profile]);

  const handleAiDraft = async () => {
    if (!isPro) {
      setRedeemOpen(true);
      return;
    }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("draft-message", {
        body: {
          contactType: contactType || "unspecified",
          contactName,
          companyName,
          contactNotes,
          agency: profile.agency,
          yearsOfService: profile.years_of_service,
          targetRole: profile.target_role_seeking,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const generated = (data as any)?.message?.trim();
      if (generated) {
        setMessage(generated);
        toast({ title: "AI draft ready", description: "Edit before sending." });
      } else {
        toast({ title: "No draft returned", variant: "destructive" });
      }
    } catch (e) {
      toast({
        title: "AI draft failed",
        description: e instanceof Error ? e.message : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast({
        title: "Copied!",
        description: "Message copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy message",
        variant: "destructive",
      });
    }
  };

  const handleOpenEmail = () => {
    if (contactEmail) {
      const subject = encodeURIComponent(`Catching up about ${companyName || "opportunities"}`);
      const body = encodeURIComponent(message);
      window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Draft your message</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>To:</strong> {contactName}
              {companyName && (
                <>
                  {" at "}
                  <strong>{companyName}</strong>
                </>
              )}
            </p>
          </div>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={8}
            className="font-mono text-sm"
          />

          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAiDraft}
              disabled={aiLoading}
              className="gap-2"
            >
              {isPro ? <Sparkles className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {aiLoading ? "Generating…" : isPro ? "AI Draft" : "AI Draft (Pro)"}
            </Button>
          </div>

          <div className="flex gap-2 justify-end">
            {contactEmail && (
              <Button onClick={handleOpenEmail} className="gap-2">
                <Mail className="h-4 w-4" />
                Open Email
              </Button>
            )}
            <Button onClick={handleCopy} variant="outline" className="gap-2">
              <Copy className="h-4 w-4" />
              Copy Text
            </Button>
            <Button onClick={() => onOpenChange(false)} variant="secondary">
              Close
            </Button>
          </div>
        </div>
        <RedeemCodeDialog open={redeemOpen} onOpenChange={setRedeemOpen} />
      </DialogContent>
    </Dialog>
  );
};
