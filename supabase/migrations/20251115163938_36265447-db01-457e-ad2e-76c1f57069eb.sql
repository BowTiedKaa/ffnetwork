-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create companies table (target companies to work at)
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT,
  target_role TEXT,
  notes TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contacts table (network contacts)
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  role TEXT,
  linkedin_url TEXT,
  warmth_level TEXT DEFAULT 'cold' CHECK (warmth_level IN ('cold', 'warm', 'hot')),
  last_contact_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create intro_pathways table (who can introduce you to whom)
CREATE TABLE public.intro_pathways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  target_company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  target_person TEXT,
  status TEXT DEFAULT 'potential' CHECK (status IN ('potential', 'requested', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create daily_tasks table
CREATE TABLE public.daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('reach_out', 'follow_up', 'warm_up', 'research')),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  due_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create follow_ups table
CREATE TABLE public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  note TEXT,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create streaks table for gamification
CREATE TABLE public.streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  total_tasks_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intro_pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for companies
CREATE POLICY "Users can view own companies" ON public.companies
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own companies" ON public.companies
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own companies" ON public.companies
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own companies" ON public.companies
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for contacts
CREATE POLICY "Users can view own contacts" ON public.contacts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own contacts" ON public.contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON public.contacts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON public.contacts
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for intro_pathways
CREATE POLICY "Users can view own intro pathways" ON public.intro_pathways
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own intro pathways" ON public.intro_pathways
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own intro pathways" ON public.intro_pathways
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own intro pathways" ON public.intro_pathways
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for daily_tasks
CREATE POLICY "Users can view own daily tasks" ON public.daily_tasks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own daily tasks" ON public.daily_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily tasks" ON public.daily_tasks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own daily tasks" ON public.daily_tasks
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for follow_ups
CREATE POLICY "Users can view own follow ups" ON public.follow_ups
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own follow ups" ON public.follow_ups
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own follow ups" ON public.follow_ups
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own follow ups" ON public.follow_ups
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for streaks
CREATE POLICY "Users can view own streak" ON public.streaks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own streak" ON public.streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own streak" ON public.streaks
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  
  INSERT INTO public.streaks (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();