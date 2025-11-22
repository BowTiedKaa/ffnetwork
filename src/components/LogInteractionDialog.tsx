import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LogInteractionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  onSuccess: () => void;
}

export const LogInteractionDialog = ({
  open,
  onOpenChange,
  contactId,
  contactName,
  onSuccess,
}: LogInteractionDialogProps) => {
  const [date, setDate] = useState<Date>(new Date());
  const [interactionType, setInteractionType] = useState<string>("email");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to log interactions",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // Insert interaction
      const { error: interactionError } = await supabase.from("interactions").insert({
        user_id: user.id,
        contact_id: contactId,
        interaction_date: format(date, "yyyy-MM-dd"),
        interaction_type: interactionType,
        notes: notes || null,
      });

      if (interactionError) throw interactionError;

      // Update contact's last_contact_date
      const { error: contactError } = await supabase
        .from("contacts")
        .update({ last_contact_date: format(date, "yyyy-MM-dd") })
        .eq("id", contactId)
        .eq("user_id", user.id);

      if (contactError) throw contactError;

      toast({
        title: "Interaction logged!",
        description: "Keep building momentum — your network is getting stronger! 🚀",
      });

      setNotes("");
      setInteractionType("email");
      setDate(new Date());
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error logging interaction:", error);
      toast({
        title: "Error",
        description: "Failed to log interaction",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Enter key submission (Cmd/Ctrl + Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Log Interaction with {contactName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Interaction Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background border z-50" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => newDate && setDate(newDate)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interactionType">Interaction Type</Label>
            <Select value={interactionType} onValueChange={setInteractionType}>
              <SelectTrigger id="interactionType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone Call</SelectItem>
                <SelectItem value="coffee">Coffee/Lunch</SelectItem>
                <SelectItem value="linkedin">LinkedIn Message</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="What did you discuss?"
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Logging..." : "Log Interaction"}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            Tip: Press Cmd+Enter (Mac) or Ctrl+Enter (Windows) to submit
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};
