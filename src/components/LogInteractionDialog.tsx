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
      // Create interaction record
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
        .eq("id", contactId);

      if (contactError) throw contactError;

      // Calculate and update warmth status
      const daysSince = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      let warmthLevel = "cold";
      if (daysSince <= 30) warmthLevel = "warm";
      else if (daysSince <= 60) warmthLevel = "cooling";

      const { error: warmthError } = await supabase
        .from("contacts")
        .update({ warmth_level: warmthLevel })
        .eq("id", contactId);

      if (warmthError) throw warmthError;

      toast({
        title: "Success!",
        description: "Interaction logged and warmth updated",
      });

      setNotes("");
      setInteractionType("email");
      setDate(new Date());
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log interaction",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(date) => date && setDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Interaction Type</Label>
            <Select value={interactionType} onValueChange={setInteractionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="message">Message</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="intro_attempt">Intro Attempt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="What did you discuss?"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Logging..." : "Log Interaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
