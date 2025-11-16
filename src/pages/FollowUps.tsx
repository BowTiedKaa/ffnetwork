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
import { Plus, Calendar, CheckCircle2 } from "lucide-react";

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

const FollowUps = () => {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
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
  }, []);

  const fetchContacts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("contacts")
      .select("id, name, company")
      .eq("user_id", user.id);

    if (data) setContacts(data);
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

    const { error } = await supabase.from("follow_ups").insert({
      user_id: user.id,
      ...formData,
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Follow-ups</h1>
          <p className="text-muted-foreground">Never miss a follow-up opportunity</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
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
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">No follow-ups scheduled. Stay on top of your network!</p>
            <Button onClick={() => setIsOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Schedule Your First Follow-up
            </Button>
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
    </div>
  );
};

export default FollowUps;
