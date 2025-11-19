import { useState } from "react";
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
}

export const SendMessageDialog = ({
  open,
  onOpenChange,
  contactName,
  contactEmail,
  companyName,
}: SendMessageDialogProps) => {
  const { toast } = useToast();
  const messageTemplate = `Hi ${contactName},

I've been thinking more about opportunities at ${companyName || "your company"} and would value your perspective. Do you have a few minutes sometime this week to catch up?

Best regards`;

  const [message, setMessage] = useState(messageTemplate);

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
