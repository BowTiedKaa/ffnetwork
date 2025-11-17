-- Add contactType column to contacts table
ALTER TABLE public.contacts 
ADD COLUMN contact_type text NOT NULL DEFAULT 'connector' 
CHECK (contact_type IN ('connector', 'trailblazer'));