-- Drop the existing CHECK constraint on contact_type
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_contact_type_check;

-- Add new CHECK constraint that allows all four contact types
ALTER TABLE contacts ADD CONSTRAINT contacts_contact_type_check 
CHECK (contact_type IN ('connector', 'trailblazer', 'reliable_recruiter', 'unspecified'));