
CREATE TABLE public.visitors (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  first_utm_source text,
  first_utm_medium text,
  first_utm_campaign text,
  first_utm_term text,
  first_utm_content text,
  first_referrer text,
  first_landing_path text,
  last_path text,
  session_count integer NOT NULL DEFAULT 1,
  event_count integer NOT NULL DEFAULT 0,
  user_agent text,
  archetype text NOT NULL DEFAULT 'new_visitor',
  archetype_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX visitors_user_id_idx ON public.visitors(user_id);
CREATE INDEX visitors_archetype_idx ON public.visitors(archetype);
CREATE INDEX visitors_last_seen_idx ON public.visitors(last_seen_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.visitors TO anon, authenticated;
GRANT ALL ON public.visitors TO service_role;

ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert visitor"
  ON public.visitors FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "visitor self select"
  ON public.visitors FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admin select all visitors"
  ON public.visitors FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "anyone can update visitor"
  ON public.visitors FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.protect_visitor_archetype()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NEW.archetype IS DISTINCT FROM OLD.archetype
     OR NEW.archetype_updated_at IS DISTINCT FROM OLD.archetype_updated_at THEN
    IF auth.uid() IS NULL OR NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
      IF current_setting('request.jwt.claim.role', true) <> 'service_role'
         AND current_setting('role', true) <> 'service_role' THEN
        NEW.archetype := OLD.archetype;
        NEW.archetype_updated_at := OLD.archetype_updated_at;
      END IF;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_visitor_archetype
  BEFORE UPDATE ON public.visitors
  FOR EACH ROW EXECUTE FUNCTION public.protect_visitor_archetype();

CREATE TABLE public.visitor_events (
  id bigserial PRIMARY KEY,
  visitor_id uuid NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  path text,
  referrer text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX visitor_events_visitor_idx ON public.visitor_events(visitor_id, occurred_at DESC);
CREATE INDEX visitor_events_name_idx ON public.visitor_events(event_name, occurred_at DESC);

GRANT INSERT ON public.visitor_events TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.visitor_events_id_seq TO anon, authenticated;
GRANT ALL ON public.visitor_events TO service_role;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.visitor_events_id_seq TO service_role;

ALTER TABLE public.visitor_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert visitor event"
  ON public.visitor_events FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "admin select visitor events"
  ON public.visitor_events FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.compute_visitor_archetype(_visitor_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v public.visitors%ROWTYPE;
  has_checkout_complete boolean;
  has_code_redeemed boolean;
  has_signup_started boolean;
  has_signup_completed boolean;
  pricing_views integer;
  has_checkout_started boolean;
  has_active_sub boolean;
  landing_path text;
  campaign text;
BEGIN
  SELECT * INTO v FROM public.visitors WHERE id = _visitor_id;
  IF NOT FOUND THEN RETURN 'new_visitor'; END IF;

  SELECT EXISTS(SELECT 1 FROM public.visitor_events WHERE visitor_id = _visitor_id AND event_name = 'checkout_completed') INTO has_checkout_complete;
  SELECT EXISTS(SELECT 1 FROM public.visitor_events WHERE visitor_id = _visitor_id AND event_name = 'code_redeemed') INTO has_code_redeemed;
  SELECT EXISTS(SELECT 1 FROM public.visitor_events WHERE visitor_id = _visitor_id AND event_name = 'signup_started' AND occurred_at > now() - interval '7 days') INTO has_signup_started;
  SELECT EXISTS(SELECT 1 FROM public.visitor_events WHERE visitor_id = _visitor_id AND event_name = 'signup_completed') INTO has_signup_completed;
  SELECT COUNT(*) INTO pricing_views FROM public.visitor_events WHERE visitor_id = _visitor_id AND event_name = 'pricing_view';
  SELECT EXISTS(SELECT 1 FROM public.visitor_events WHERE visitor_id = _visitor_id AND event_name = 'checkout_started') INTO has_checkout_started;

  IF v.user_id IS NOT NULL THEN
    SELECT public.has_active_subscription(v.user_id, 'live') INTO has_active_sub;
  ELSE
    has_active_sub := false;
  END IF;

  landing_path := COALESCE(v.first_landing_path, '');
  campaign := COALESCE(v.first_utm_campaign, '');

  IF has_checkout_complete OR has_active_sub THEN RETURN 'paying';
  ELSIF has_code_redeemed THEN RETURN 'code_redeemer';
  ELSIF has_signup_started AND NOT has_signup_completed THEN RETURN 'signup_in_progress';
  ELSIF pricing_views >= 2 OR has_checkout_started THEN RETURN 'pricing_considerer';
  ELSIF landing_path ~* '(sales|bd|revenue)' OR campaign ~* '(sales|bd|revenue)' THEN RETURN 'revenue_curious';
  ELSIF landing_path ~* '(policy|legal)' OR campaign ~* '(policy|legal)' THEN RETURN 'policy_curious';
  ELSIF v.session_count >= 3 THEN RETURN 'returning_browser';
  ELSE RETURN 'new_visitor';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_visitor_archetype()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_label text;
BEGIN
  new_label := public.compute_visitor_archetype(NEW.visitor_id);
  UPDATE public.visitors
     SET archetype = new_label,
         archetype_updated_at = now(),
         event_count = event_count + 1,
         last_seen_at = now()
   WHERE id = NEW.visitor_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recompute_archetype
  AFTER INSERT ON public.visitor_events
  FOR EACH ROW EXECUTE FUNCTION public.recompute_visitor_archetype();
