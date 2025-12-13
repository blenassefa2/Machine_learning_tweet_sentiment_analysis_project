-- Add labeled_file column to datasets table
ALTER TABLE public.datasets 
ADD COLUMN IF NOT EXISTS labeled_file TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.datasets.labeled_file IS 'Path to the labeled dataset file in storage (created after labeling operation)';

