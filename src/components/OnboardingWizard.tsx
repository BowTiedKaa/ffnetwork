import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, Sparkles, Building2, Users, TrendingUp, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface OnboardingWizardProps {
  open: boolean;
  onComplete: () => void;
}

interface CompanyData {
  name: string;
  industry: string;
  target_role: string;
  priority: number;
}

interface ContactData {
  name: string;
  company: string;
  contact_type: "connector" | "trailblazer" | "reliable_recruiter" | "unspecified";
  warmth_level: "warm" | "cooling" | "cold";
  notes: string;
}

export const OnboardingWizard = ({ open, onComplete }: OnboardingWizardProps) => {
  const [step, setStep] = useState(1);
  const [companies, setCompanies] = useState<CompanyData[]>([
    { name: "", industry: "", target_role: "", priority: 3 }
  ]);
  const [contacts, setContacts] = useState<ContactData[]>([
    { name: "", company: "", contact_type: "unspecified", warmth_level: "warm", notes: "" },
    { name: "", company: "", contact_type: "unspecified", warmth_level: "warm", notes: "" },
    { name: "", company: "", contact_type: "unspecified", warmth_level: "warm", notes: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleAddCompany = () => {
    if (companies.length < 3) {
      setCompanies([...companies, { name: "", industry: "", target_role: "", priority: 3 }]);
    }
  };

  const handleCompanyChange = (index: number, field: keyof CompanyData, value: string | number) => {
    const updated = [...companies];
    updated[index] = { ...updated[index], [field]: value };
    setCompanies(updated);
  };

  const handleContactChange = (index: number, field: keyof ContactData, value: string) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  };

  const handleNext = async () => {
    if (step === 2) {
      // Validate at least one company
      const validCompanies = companies.filter(c => c.name.trim());
      if (validCompanies.length === 0) {
        toast({
          title: "Add at least one company",
          description: "Enter a company name to continue",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (step === 3) {
      // Validate at least one contact
      const validContacts = contacts.filter(c => c.name.trim());
      if (validContacts.length === 0) {
        toast({
          title: "Add at least one contact",
          description: "Enter a contact name to continue",
          variant: "destructive",
        });
        return;
      }
    }

    if (step < 5) {
      setStep(step + 1);
    } else {
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Save companies
      const validCompanies = companies.filter(c => c.name.trim());
      if (validCompanies.length > 0) {
        const { error: companiesError } = await supabase
          .from("companies")
          .insert(
            validCompanies.map(c => ({
              user_id: user.id,
              name: c.name,
              industry: c.industry || null,
              target_role: c.target_role || null,
              priority: c.priority,
            }))
          );

        if (companiesError) throw companiesError;
      }

      // Save contacts
      const validContacts = contacts.filter(c => c.name.trim());
      if (validContacts.length > 0) {
        const { error: contactsError } = await supabase
          .from("contacts")
          .insert(
            validContacts.map(c => ({
              user_id: user.id,
              name: c.name,
              company: c.company || null,
              contact_type: c.contact_type,
              warmth_level: c.warmth_level,
              notes: c.notes || null,
              last_contact_date: new Date().toISOString(),
            }))
          );

        if (contactsError) throw contactsError;
      }

      toast({
        title: "Welcome aboard! 🎉",
        description: "Your network is set up. Let's build momentum!",
      });

      onComplete();
    } catch (error) {
      console.error("Onboarding error:", error);
      toast({
        title: "Error",
        description: "Failed to complete setup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 mx-1 rounded-full transition-colors ${
                  s <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center space-y-4 py-8">
              <Sparkles className="h-16 w-16 mx-auto text-primary" />
              <h2 className="text-3xl font-bold">Build Your Network Advantage</h2>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                This app helps you turn your existing relationships into interviews, intros, and job offers.
              </p>
              <Button onClick={handleNext} size="lg" className="mt-6">
                Get Started
              </Button>
            </div>
          )}

          {/* Step 2: Add Companies */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <Building2 className="h-12 w-12 mx-auto text-primary mb-3" />
                <h2 className="text-2xl font-bold">Add Your First Target Companies</h2>
                <p className="text-muted-foreground">Where do you want to work? Add 1-3 companies.</p>
              </div>

              <div className="space-y-4">
                {companies.map((company, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <Label>Company Name *</Label>
                          <Input
                            value={company.name}
                            onChange={(e) => handleCompanyChange(index, "name", e.target.value)}
                            placeholder="e.g., Google, Stripe"
                          />
                        </div>
                        <div>
                          <Label>Industry</Label>
                          <Input
                            value={company.industry}
                            onChange={(e) => handleCompanyChange(index, "industry", e.target.value)}
                            placeholder="e.g., Tech, Finance"
                          />
                        </div>
                        <div>
                          <Label>Target Role</Label>
                          <Input
                            value={company.target_role}
                            onChange={(e) => handleCompanyChange(index, "target_role", e.target.value)}
                            placeholder="e.g., Product Manager"
                          />
                        </div>
                        <div>
                          <Label>Priority (1-5)</Label>
                          <Input
                            type="number"
                            min="1"
                            max="5"
                            value={company.priority}
                            onChange={(e) => handleCompanyChange(index, "priority", parseInt(e.target.value) || 1)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {companies.length < 3 && (
                <Button variant="outline" onClick={handleAddCompany} className="w-full">
                  Add Another Company
                </Button>
              )}

              <Button onClick={handleNext} className="w-full" size="lg">
                Next
              </Button>
            </div>
          )}

          {/* Step 3: Add Contacts */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <Users className="h-12 w-12 mx-auto text-primary mb-3" />
                <h2 className="text-2xl font-bold">Add 3 Contacts</h2>
                <p className="text-muted-foreground">
                  Add 3 people you've spoken with in the past year. These are your warmest starting points.
                </p>
              </div>

              <div className="space-y-4">
                {contacts.map((contact, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <Label>Name *</Label>
                          <Input
                            value={contact.name}
                            onChange={(e) => handleContactChange(index, "name", e.target.value)}
                            placeholder="Full name"
                          />
                        </div>
                        <div>
                          <Label>Company</Label>
                          <Input
                            value={contact.company}
                            onChange={(e) => handleContactChange(index, "company", e.target.value)}
                            placeholder="Where they work"
                          />
                        </div>
                        <div>
                          <Label>Contact Type</Label>
                          <Select
                            value={contact.contact_type}
                            onValueChange={(value) => handleContactChange(index, "contact_type", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background border">
                              <SelectItem value="connector">Connector</SelectItem>
                              <SelectItem value="trailblazer">Trailblazer</SelectItem>
                              <SelectItem value="reliable_recruiter">Reliable Recruiter</SelectItem>
                              <SelectItem value="unspecified">Unspecified</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <Label>Notes (optional)</Label>
                          <Textarea
                            value={contact.notes}
                            onChange={(e) => handleContactChange(index, "notes", e.target.value)}
                            placeholder="How do you know them?"
                            rows={2}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button onClick={handleNext} className="w-full" size="lg">
                Next
              </Button>
            </div>
          )}

          {/* Step 4: How Daily Actions Work */}
          {step === 4 && (
            <div className="text-center space-y-4 py-8">
              <Target className="h-16 w-16 mx-auto text-primary" />
              <h2 className="text-3xl font-bold">How Daily Actions Work</h2>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                You'll get 2–3 high-impact networking tasks each day. Completing them builds momentum toward interviews.
              </p>
              <div className="mt-6 space-y-3 text-left max-w-md mx-auto">
                <Card className="p-4">
                  <p className="text-sm">
                    <strong>Smart Prioritization:</strong> We surface contacts who are cooling, connectors with influence at target companies, and recruiters at the right time.
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm">
                    <strong>Track Your Streak:</strong> Daily consistency builds network momentum. Keep your streak alive!
                  </p>
                </Card>
              </div>
              <Button onClick={handleNext} size="lg" className="mt-6">
                Next
              </Button>
            </div>
          )}

          {/* Step 5: You're Ready */}
          {step === 5 && (
            <div className="text-center space-y-6 py-8">
              <div className="h-16 w-16 mx-auto bg-primary rounded-full flex items-center justify-center">
                <Check className="h-10 w-10 text-primary-foreground" />
              </div>
              <h2 className="text-3xl font-bold">You're Ready!</h2>
              <p className="text-muted-foreground">Here's what you can do now:</p>
              
              <div className="space-y-3 max-w-md mx-auto text-left">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Daily Actions</span>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Paths Into Companies</span>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Type-Specific Outreach Templates</span>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Progress Tracking</span>
                </div>
              </div>

              <Button 
                onClick={handleNext} 
                size="lg" 
                className="mt-6"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Setting up..." : "Go to Dashboard"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
