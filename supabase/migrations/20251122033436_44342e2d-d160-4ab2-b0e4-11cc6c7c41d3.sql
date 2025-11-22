-- Update default value for contact_type to 'unspecified'
ALTER TABLE public.contacts 
ALTER COLUMN contact_type SET DEFAULT 'unspecified';

-- Update any existing null contact_type values to 'unspecified'
UPDATE public.contacts 
SET contact_type = 'unspecified' 
WHERE contact_type IS NULL;