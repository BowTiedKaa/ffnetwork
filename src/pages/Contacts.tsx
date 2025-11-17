import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Mail, Briefcase, Thermometer, Users, TrendingUp } from "lucide-react";
import { z } from "zod";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().max(255, "Email must be less than 255 characters").email("Invalid email address").optional().or(z.literal("")),
  company: z.string().trim().max(100, "Company name must be less than 100 characters").optional(),
  role: z.string().trim().max(100, "Role must be less than 100 characters").optional(),
  notes: z.string().trim().max(1000, "Notes must be less than 1000 characters").optional(),
  warmth_level: z.enum(["cold", "warm", "hot"]),
  contact_type: z.enum(["connector", "trailblazer"]),
});

interface Contact {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  role: string | null;
  warmth_level: string;
  last_contact_date: string | null;
  notes: string | null;
  contact_type: string;
}

const Contacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [contactTypeStep, setContactTypeStep] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    warmth_level: "cold",
    notes: "",
    contact_type: "connector" as "connector" | "trailblazer",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setContacts(data);
    // Error silently handled - user will see empty state
  };

  const handleContactTypeSelect = (type: "connector" | "trailblazer") => {
    setFormData({ ...formData, contact_type: type });
    setContactTypeStep(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const validatedData = contactSchema.parse(formData);

      const { error } = await supabase.from("contacts").insert({
        user_id: user.id,
        name: validatedData.name,
        email: validatedData.email || null,
        company: validatedData.company || null,
        role: validatedData.role || null,
        warmth_level: validatedData.warmth_level,
        notes: validatedData.notes || null,
        contact_type: validatedData.contact_type,
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add contact",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Contact added!",
        description: "Successfully added to your network",
      });

      setIsOpen(false);
      setContactTypeStep(true);
      setFormData({ name: "", email: "", company: "", role: "", warmth_level: "cold", notes: "", contact_type: "connector" });
      fetchContacts();
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

  const handleDialogChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setContactTypeStep(true);
      setFormData({ name: "", email: "", company: "", role: "", warmth_level: "cold", notes: "", contact_type: "connector" });
    }
  };

  const getWarmthColor = (level: string) => {
    switch (level) {
      case "cold": return "bg-blue-500";
      case "warm": return "bg-yellow-500";
      case "hot": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getContactTypeInfo = (type: string) => {
    if (type === "connector") {
      return {
        icon: Users,
        label: "Connector",
        className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      };
    }
    return {
      icon: TrendingUp,
      label: "Trailblazer",
      className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Contacts</h1>
          <p className="text-muted-foreground">Manage your professional network</p>
        </div>
        <Dialog open={isOpen} onOpenChange={handleDialogChange}>
          <Button onClick={() => setIsOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Contact
          </Button>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {contactTypeStep ? "What type of contact are you adding?" : "Add New Contact"}
              </DialogTitle>
            </DialogHeader>
            
            {contactTypeStep ? (
              <div className="space-y-4 py-4">
                <RadioGroup onValueChange={(value) => handleContactTypeSelect(value as "connector" | "trailblazer")}>
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="connector" id="connector" />
                    <div className="flex-1">
                      <Label htmlFor="connector" className="cursor-pointer font-semibold">
                        Connector
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Senior people, former colleagues, mentors, or trusted contacts who can provide warm introductions
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="trailblazer" id="trailblazer" />
                    <div className="flex-1">
                      <Label htmlFor="trailblazer" className="cursor-pointer font-semibold">
                        Trailblazer
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        People with government/public-sector background who transitioned to roles you want
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warmth">Relationship Warmth</Label>
                <Select value={formData.warmth_level} onValueChange={(value) => setFormData({ ...formData, warmth_level: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cold">Cold - Haven't connected yet</SelectItem>
                    <SelectItem value="warm">Warm - Had some conversations</SelectItem>
                    <SelectItem value="hot">Hot - Strong relationship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setContactTypeStep(true)} className="flex-1">
                    Back
                  </Button>
                  <Button type="submit" className="flex-1">Add Contact</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {contacts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-3">Build your connectors and trailblazers</h2>
              <p className="text-muted-foreground mb-6">
                Add 3 connectors and 2 trailblazers. These five people form the core of your job search.
              </p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 text-left max-w-3xl mx-auto">
              <div className="p-4 border rounded-lg bg-purple-50 dark:bg-purple-950/20">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold">Connectors</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Senior people, former colleagues, mentors, trusted contacts — people who can provide warm introductions to hiring managers or recruiters at targeted companies.
                </p>
              </div>
              
              <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold">Trailblazers</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  People with a government or public-sector background who have already transitioned into the types of roles you want.
                </p>
              </div>
            </div>

            <Button onClick={() => setIsOpen(true)} size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Contacts
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact) => {
            const contactTypeInfo = getContactTypeInfo(contact.contact_type);
            const ContactIcon = contactTypeInfo.icon;
            
            return (
              <Card key={contact.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2 mb-2">
                        {contact.name}
                        <Badge variant="secondary" className={contactTypeInfo.className}>
                          <ContactIcon className="h-3 w-3 mr-1" />
                          {contactTypeInfo.label}
                        </Badge>
                      </CardTitle>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${getWarmthColor(contact.warmth_level)}`} />
                        <span className="text-xs capitalize text-muted-foreground">
                          {contact.warmth_level}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {contact.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.company && (
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span>{contact.company}</span>
                      {contact.role && <span className="text-muted-foreground">• {contact.role}</span>}
                    </div>
                  )}
                  {contact.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                      {contact.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Contacts;
