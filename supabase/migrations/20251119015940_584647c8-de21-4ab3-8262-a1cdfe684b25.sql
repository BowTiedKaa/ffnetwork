-- Add company_id foreign key to contacts table
ALTER TABLE public.contacts 
ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_contacts_company_id ON public.contacts(company_id);

-- Migrate existing data: match contacts to companies by name (case-insensitive)
UPDATE public.contacts
SET company_id = (
  SELECT c.id 
  FROM public.companies c 
  WHERE LOWER(TRIM(c.name)) = LOWER(TRIM(contacts.company))
  LIMIT 1
)
WHERE contacts.company IS NOT NULL 
AND contacts.company_id IS NULL;