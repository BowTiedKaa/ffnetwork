-- Add archive fields to contacts table
ALTER TABLE public.contacts
ADD COLUMN is_archived boolean DEFAULT false,
ADD COLUMN archived_at timestamp with time zone;

-- Add archive fields to companies table
ALTER TABLE public.companies
ADD COLUMN is_archived boolean DEFAULT false,
ADD COLUMN archived_at timestamp with time zone;

-- Create indexes for better query performance
CREATE INDEX idx_contacts_is_archived ON public.contacts(is_archived);
CREATE INDEX idx_companies_is_archived ON public.companies(is_archived);