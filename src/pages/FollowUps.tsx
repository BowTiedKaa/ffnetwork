import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, CheckCircle2, MessageSquare, CheckCheck, Flame } from "lucide-react";
import { z } from "zod";
import { CONTACT_COACHING, ContactType } from "@/lib/contactCoaching";
import { SendMessageDialog } from "@/components/SendMessageDialog";

const followUpSchema = z.object({
  contact_id: z.string().uuid("Please select a valid contact"),
  due_date: z.string().min(1, "Due date is required"),
  note: z.string().trim().max(1000, "Note must be less than 1000 characters").optional(),
});

interface FollowUp {
  id: string;
  contact_id: string;
  due_date: string;
  note: string | null;
  completed: boolean;
  contacts: {
    name: string;
    company: string | null;
  };
}

interface Contact {
  id: string;
  name: string;
  company: string | null;
}

interface NeedsContact {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  contact_type: ContactType;
  warmth_level: string | null;
  last_contact_date: string | null;
  notes: string | null;
}

const FollowUps = () => {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [needsFollowUp, setNeedsFollowUp] = useState<NeedsContact[]>([]);
  const [messageContact, setMessageContact] = useState<NeedsContact | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    contact_id: "",
    due_date: "",
    note: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchFollowUps();
    fetchContacts();
    fetchNeedsFollowUp();
  }, []);

  const fetchContacts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("contacts")
      .select("id, name, company")
      .eq("user_id", user.id)
      .eq("is_archived", false);

    if (data) setContacts(data);
  };

  const fetchNeedsFollowUp = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const cutoff = fiveDaysAgo.toISOString();

    const { data } = await supabase
      .from("contacts")
      .select("id, name, email, company, contact_type, warmth_level, last_contact_date, notes")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .in("warmth_level", ["cold", "hot"])
      .or(`last_contact_date.is.null,last_contact_date.lt.${cutoff}`);

    if (data) {
      const sorted = (data as NeedsContact[]).sort((a, b) => {
        if (!a.last_contact_date && b.last_contact_date) return -1;
        if (a.last_contact_date && !b.last_contact_date) return 1;
        if (!a.last_contact_date && !b.last_contact_date) return 0;
        return new Date(a.last_contact_date!).getTime() - new Date(b.last_contact_date!).getTime();
      });
      setNeedsFollowUp(sorted);
    }
  };

  const handleLogInteraction = async (contact: NeedsContact) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Bump warmth one level up: cold -> warm -> hot
    const nextWarmth =
      contact.warmth_level === "cold" ? "warm" :
      contact.warmth_level === "warm" ? "hot" :
      "hot";

    const today = new Date().toISOString();

    const { error: contactErr } = await supabase
      .from("contacts")
      .update({ last_contact_date: today, warmth_level: nextWarmth })
      .eq("id", contact.id);

    if (contactErr) {
      toast({ title: "Error", description: "Could not log interaction", variant: "destructive" });
      return;
    }

    await supabase.from("interactions").insert({
      user_id: user.id,
      contact_id: contact.id,
      interaction_type: "follow_up",
      interaction_date: new Date().toISOString().slice(0, 10),
    });

    toast({ title: "Interaction logged", description: `${contact.name} marked as ${nextWarmth}.` });
    fetchNeedsFollowUp();
  };

  const daysSince = (iso: string | null) => {
    if (!iso) return null;
    const ms = Date.now() - new Date(iso).getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  };

  const contactTypeBadgeClass = (t: ContactType) => {
    switch (t) {
      case "connector": return "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200";
      case "trailblazer": return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200";
      case "reliable_recruiter": return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const fetchFollowUps = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("follow_ups")
      .select(`
        *,
        contacts (name, company)
      `)
      .eq("user_id", user.id)
      .order("due_date", { ascending: true });

    if (data) setFollowUps(data);
    // Error silently handled - user will see empty state
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const validatedData = followUpSchema.parse(formData);

      const { error } = await supabase.from("follow_ups").insert({
        user_id: user.id,
        contact_id: validatedData.contact_id,
        due_date: validatedData.due_date,
        note: validatedData.note || null,
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add follow-up",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Follow-up added!",
        description: "Successfully scheduled follow-up",
      });

      setIsOpen(false);
      setFormData({ contact_id: "", due_date: "", note: "" });
      fetchFollowUps();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  const handleComplete = async (id: string, completed: boolean) => {
    const { error } = await supabase
      .from("follow_ups")
      .update({ completed, completed_at: completed ? new Date().toISOString() : null })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update follow-up",
        variant: "destructive",
      });
      return;
    }

    setFollowUps(followUps.map(f => f.id === id ? { ...f, completed } : f));
    
    if (completed) {
      toast({
        title: "Follow-up completed!",
        description: "Great job staying on top of your network! 👍",
      });
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && !followUps.find(f => f.due_date === dueDate)?.completed;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Follow-ups</h1>
        <p className="text-muted-foreground">Stay in motion. Re-engage what's cooling, schedule what matters.</p>
      </div>
      <div className="rounded-md border-l-4 border-primary bg-muted/40 p-4 text-sm">
        <strong>Cadence:</strong> 24-hour thank-you → 3-5 day check-in → detach and move on.
        No response after 5 days? Assume it's a no. Add two new contacts for every one that goes cold.
        Rejection is structural, not personal.
      </div>

      {/* Section 1 — Auto-generated Needs Follow-up */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Flame className="h-6 w-6 text-primary" />
              Needs Follow-up
            </h2>
            <p className="text-sm text-muted-foreground">
              Cold or hot contacts you haven't touched in 5+ days. Re-engage now.
            </p>
          </div>
          <Badge variant="secondary" className="text-base px-3 py-1">{needsFollowUp.length}</Badge>
        </div>

        {needsFollowUp.length === 0 ? (
          <Card>
            <CardContent className="text-center py-10">
              <CheckCheck className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">You're caught up. Nothing needs attention right now.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {needsFollowUp.map((c) => {
              const type = (c.contact_type as ContactType) || "unspecified";
              const meta = CONTACT_COACHING[type];
              const days = daysSince(c.last_contact_date);
              return (
                <Card key={c.id}>
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold">{c.name}</h3>
                          <Badge variant="secondary" className={contactTypeBadgeClass(type)}>
                            {meta.label}
                          </Badge>
                          {c.company && (
                            <span className="text-sm text-muted-foreground">at {c.company}</span>
                          )}
                          {c.warmth_level === "hot" && (
                            <Badge variant="destructive">hot</Badge>
                          )}
                          {c.warmth_level === "cold" && (
                            <Badge variant="outline">cold</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          <span className="font-medium text-foreground">Goal:</span> {meta.goal}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {days === null
                            ? "Never contacted"
                            : `${days} day${days === 1 ? "" : "s"} since last contact`}
                        </p>
                      </div>
                      <div className="flex flex-row md:flex-col gap-2 md:w-44">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 flex-1"
                          onClick={() => handleLogInteraction(c)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Log Interaction
                        </Button>
                        <Button
                          size="sm"
                          className="gap-2 flex-1"
                          onClick={() => setMessageContact(c)}
                        >
                          <MessageSquare className="h-4 w-4" />
                          Message
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2 — Manual Scheduled Follow-ups */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div>
          <h2 className="text-2xl font-bold mb-1">Scheduled Follow-ups</h2>
          <p className="text-sm text-muted-foreground">Manual reminders you've set for specific dates.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Schedule Follow-up
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule Follow-up</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact_id">Contact *</Label>
                <Select value={formData.contact_id} onValueChange={(value) => setFormData({ ...formData, contact_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name} {contact.company && `- ${contact.company}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows={3}
                  placeholder="What do you want to discuss?"
                />
              </div>
              <Button type="submit" className="w-full">Schedule Follow-up</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {followUps.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground text-sm">No manually scheduled follow-ups.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {followUps.map((followUp) => (
            <Card key={followUp.id} className={followUp.completed ? "opacity-60" : ""}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={followUp.completed}
                    onCheckedChange={(checked) => handleComplete(followUp.id, checked as boolean)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`font-semibold ${followUp.completed ? "line-through" : ""}`}>
                        {followUp.contacts.name}
                      </h3>
                      {followUp.contacts.company && (
                        <span className="text-sm text-muted-foreground">
                          at {followUp.contacts.company}
                        </span>
                      )}
                      {followUp.completed && (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Completed
                        </Badge>
                      )}
                      {!followUp.completed && isOverdue(followUp.due_date) && (
                        <Badge variant="destructive">Overdue</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(followUp.due_date).toLocaleDateString()}
                    </div>
                    {followUp.note && (
                      <p className="text-sm text-muted-foreground">{followUp.note}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {messageContact && (
        <SendMessageDialog
          open={!!messageContact}
          onOpenChange={(open) => !open && setMessageContact(null)}
          contactName={messageContact.name}
          contactEmail={messageContact.email}
          companyName={messageContact.company}
          contactType={(messageContact.contact_type as "connector" | "trailblazer" | "reliable_recruiter" | "unspecified") || "unspecified"}
          contactNotes={messageContact.notes}
        />
      )}
    </div>
  );
};

export default FollowUps;
