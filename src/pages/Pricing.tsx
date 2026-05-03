import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Crown } from "lucide-react";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { useUserAccess } from "@/hooks/useUserAccess";
import type { User } from "@supabase/supabase-js";

const PLANS = [
  {
    priceId: "pro_monthly",
    name: "Pro Monthly",
    price: "$19",
    cadence: "/month",
    description: "Billed monthly. Cancel anytime.",
  },
  {
    priceId: "pro_yearly",
    name: "Pro Annual",
    price: "$149",
    cadence: "/year",
    description: "Best value — save over 30%.",
    highlight: true,
  },
];

const FEATURES = [
  "Unlimited contacts and companies",
  "AI message drafting",
  "Pitch Builder",
  "Call prep guides",
  "All future Pro features",
];

export default function Pricing() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const { isPro } = useUserAccess(user?.id);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const returnUrl = `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">FF Network Pro</h1>
        <p className="text-muted-foreground">
          Everything you need to run the Former Fed methodology.
        </p>
      </div>

      {isPro && (
        <Card className="p-4 bg-amber-50 border-amber-200 flex items-center gap-3">
          <Crown className="h-5 w-5 text-amber-700" />
          <p className="text-sm text-amber-900">You already have Pro access.</p>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => navigate("/dashboard")}>
            Go to dashboard
          </Button>
        </Card>
      )}

      {!selected && (
        <div className="grid md:grid-cols-2 gap-4">
          {PLANS.map((p) => (
            <Card
              key={p.priceId}
              className={`p-6 space-y-4 ${p.highlight ? "border-primary border-2" : ""}`}
            >
              <div>
                <h2 className="text-xl font-semibold">{p.name}</h2>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{p.price}</span>
                  <span className="text-muted-foreground">{p.cadence}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
              </div>
              <ul className="space-y-2">
                {FEATURES.map((f) => (
                  <li key={f} className="flex gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={p.highlight ? "default" : "outline"}
                onClick={() => setSelected(p.priceId)}
                disabled={!user}
              >
                {user ? `Subscribe — ${p.price}${p.cadence}` : "Sign in to subscribe"}
              </Button>
            </Card>
          ))}
        </div>
      )}

      {selected && user && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Complete your purchase</h2>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              Change plan
            </Button>
          </div>
          <StripeEmbeddedCheckout
            priceId={selected}
            customerEmail={user.email || undefined}
            userId={user.id}
            returnUrl={returnUrl}
          />
        </Card>
      )}
    </div>
  );
}