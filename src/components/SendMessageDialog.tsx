import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, Copy } from "lucide-react";

interface SendMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  contactEmail?: string | null;
  companyName?: string | null;
  contactType?: "connector" | "trailblazer" | "reliable_recruiter" | "unspecified" | null;
  targetRole?: string | null;
}

export const SendMessageDialog = ({
  open,
  onOpenChange,
  contactName,
  contactEmail,
  companyName,
  contactType = "unspecified",
  targetRole,
}: SendMessageDialogProps) => {
  const { toast } = useToast();
  
  const getMessageTemplate = () => {
    const firstName = contactName.split(" ")[0];
    const company = companyName || "[company]";
    const roleTeam = targetRole || "[role/team]";
    const specificDate = "[specific date]";
    
    switch (contactType) {
      case "connector":
        return `Hi ${firstName},

Do you have 15–20 minutes on ${specificDate}? I'd like to talk through the ${roleTeam} at ${company} and get your perspective on whether it's a strong fit. Your read on the people involved would be helpful.

Best,
[YourName]`;
      
      case "trailblazer":
        return `Hi ${firstName},

Do you have 15–20 minutes on ${specificDate}? I'm looking at the ${roleTeam} at ${company} and wanted to hear how you handled your own transition and what you'd focus on early in the process.

Best,
[YourName]`;
      
      case "reliable_recruiter":
        return `Hi ${firstName},

Are you available for 15–20 minutes on ${specificDate}? I'm preparing for the ${roleTeam} at ${company} and wanted your perspective on how this team evaluates candidates and where people tend to get stuck.

Best,
[YourName]`;
      
      default: // unspecified or null
        return `Hi ${firstName},

Do you have 15–20 minutes on ${specificDate}? I'm exploring the ${roleTeam} at ${company} and would value your perspective.

Best,
[YourName]`;
    }
  };

  const [message, setMessage] = useState("");

  // Regenerate message whenever contact props change
  useEffect(() => {
    setMessage(getMessageTemplate());
  }, [contactName, companyName, contactType, targetRole]);

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
      </DialogContent>
    </Dialog>
  );
};
