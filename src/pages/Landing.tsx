import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Users, Building2, Calendar, Sparkles, Crown, Flame } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Helmet } from "react-helmet-async";
import logo from "@/assets/former-fed-logo.jpg";

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Who is FF Network for?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Former federal employees moving into tech — especially those targeting revenue roles like Sales, Business Development, and Customer Success.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a free plan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The free plan covers 5 contacts and 3 companies so you can try the methodology before upgrading.",
      },
    },
    {
      "@type": "Question",
      name: "What do I get with Pro?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Unlimited contacts and companies, AI message drafting, the Pitch Builder, and call prep guides — everything to run the Former Fed methodology.",
      },
    },
  ],
};

const Landing = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard", { replace: true });
      } else {
        setChecking(false);
      }
    });
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="FF Network — Land a tech job after federal service"
        description="The career transition tracker built for former federal employees moving into tech sales, BD, and customer success. Track contacts, follow-ups, and momentum."
        path="/"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(FAQ_JSONLD)}</script>
      </Helmet>

      {/* Nav */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={logo}
              alt="Former Fed"
              className="h-9 w-auto"
              width={144}
              height={36}
              fetchPriority="high"
              decoding="async"
            />
          </Link>
          <nav className="flex items-center gap-2">
            <Button onClick={() => navigate("/auth")}>Get started — free</Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <p className="inline-block text-xs font-semibold uppercase tracking-wider text-primary-foreground bg-primary px-3 py-1 rounded-full">
            For Aspiring Former Feds
          </p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Land a tech job after federal service
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            FF Network is the career transition tracker built around the Former Fed methodology —
            prioritize revenue roles, keep contacts warm, and turn networking into offers.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
              Start free — 5 contacts
            </Button>
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            No credit card required. Upgrade when you're ready.
          </p>
        </div>
      </section>

      {/* Problem / promise */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-16 grid md:grid-cols-3 gap-8 max-w-5xl">
          {[
            {
              icon: Flame,
              title: "Contacts go cold fast",
              body: "Most fed-to-tech transitions stall because warm intros get buried. We surface who's cooling before you lose them.",
            },
            {
              icon: Sparkles,
              title: "Revenue roles, not cost centers",
              body: "We point you at Sales, BD, and CS — the roles tech companies hire fastest and pay best — not policy or legal dead-ends.",
            },
            {
              icon: Users,
              title: "A repeatable system",
              body: "Track every contact, company, and follow-up in one place. Run the methodology end-to-end, week after week.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="space-y-3">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-semibold text-lg">{title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20 max-w-5xl">
        <div className="text-center mb-12 space-y-3">
          <h2 className="text-3xl md:text-4xl font-bold">Everything you need to run the play</h2>
          <p className="text-muted-foreground">From first warm intro to signed offer</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { icon: Users, title: "Contacts with warmth signals", body: "Warm (0–14d), Cooling (15–30d), Cold (30+d). Know exactly who to message next." },
            { icon: Building2, title: "Companies & paths", body: "Track every company you're targeting and the people inside them." },
            { icon: Calendar, title: "Follow-up reminders", body: "Never lose momentum. We tell you who to reach out to today." },
            { icon: Sparkles, title: "AI-drafted outreach (Pro)", body: "Personalized messages and pitch decks generated from your background and the role." },
          ].map(({ icon: Icon, title, body }) => (
            <Card key={title} className="p-6 space-y-2">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">{title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-20 max-w-4xl">
          <div className="text-center mb-10 space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold">Start free. Upgrade when it's working.</h2>
            <p className="text-muted-foreground">Pro is the same price as a coffee a week.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6 space-y-4">
              <div>
                <h3 className="text-xl font-semibold">Free</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">$0</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Try the methodology.</p>
              </div>
              <ul className="space-y-2 text-sm">
                {["5 contacts", "3 companies", "Follow-up reminders"].map((f) => (
                  <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />{f}</li>
                ))}
              </ul>
              <Button variant="outline" className="w-full" onClick={() => navigate("/auth")}>Create free account</Button>
            </Card>
            <Card className="p-6 space-y-4 border-primary border-2 relative">
              <div className="absolute -top-3 left-6 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded">
                Most popular
              </div>
              <div>
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" /> Pro
                </h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">$19</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Or $149/year — save 30%.</p>
              </div>
              <ul className="space-y-2 text-sm">
                {["Unlimited contacts & companies", "AI message drafting", "Pitch Builder", "Call prep guides"].map((f) => (
                  <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />{f}</li>
                ))}
              </ul>
              <Button className="w-full" onClick={() => navigate("/pricing")}>See pricing</Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 py-20 text-center max-w-2xl space-y-6">
        <h2 className="text-3xl md:text-4xl font-bold">Your next role is one warm intro away</h2>
        <p className="text-muted-foreground">Join other former feds succeeding with a networking-first strategy.</p>
        <Button size="lg" onClick={() => navigate("/auth")}>Get started — free</Button>
      </section>

      <footer className="border-t">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} FF Network. Built by former feds, for former feds.</p>
          <nav className="flex gap-4">
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
            <a href="https://formerfed.substack.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Newsletter</a>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default Landing;