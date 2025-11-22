-- Add connector influence and recruiter specialization fields to contacts table
ALTER TABLE public.contacts
ADD COLUMN connector_influence_company_ids uuid[],
ADD COLUMN recruiter_specialization text;

-- Add check constraint for recruiter_specialization values
ALTER TABLE public.contacts
ADD CONSTRAINT contacts_recruiter_specialization_check 
CHECK (recruiter_specialization IS NULL OR recruiter_specialization IN ('industry_knowledge', 'interview_prep', 'offer_negotiation'));