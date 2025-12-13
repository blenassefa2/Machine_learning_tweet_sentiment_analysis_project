-- ============================================
-- Update datasets table to add labeled_file column
-- ============================================
ALTER TABLE public.datasets 
ADD COLUMN IF NOT EXISTS labeled_file TEXT;

COMMENT ON COLUMN public.datasets.labeled_file IS 'Path to the labeled dataset file in storage (created after labeling operation)';

-- ============================================
-- Create label_jobs table for tracking labeling job progress
-- ============================================
CREATE TABLE IF NOT EXISTS public.label_jobs (
    job_id UUID PRIMARY KEY,
    dataset_id UUID REFERENCES public.datasets(dataset_id) ON DELETE CASCADE,
    session_id UUID,
    method TEXT NOT NULL, -- "manual", "naive", "kmeans", "dbscan", "agglomerative", "hierarchical"
    status TEXT NOT NULL DEFAULT 'pending', -- "pending", "running", "completed", "error"
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    labeled_file TEXT
);

COMMENT ON TABLE public.label_jobs IS 'Tracks labeling job progress and status';
COMMENT ON COLUMN public.label_jobs.method IS 'Labeling method: manual, naive, kmeans, dbscan, agglomerative, or hierarchical';
COMMENT ON COLUMN public.label_jobs.status IS 'Job status: pending, running, completed, or error';
COMMENT ON COLUMN public.label_jobs.progress IS 'Job progress percentage (0-100)';
COMMENT ON COLUMN public.label_jobs.labeled_file IS 'Path to the labeled dataset file in storage';

-- ============================================
-- Create labelings table for storing labeling results and metadata
-- ============================================
CREATE TABLE IF NOT EXISTS public.labelings (
    labeling_id UUID PRIMARY KEY,
    dataset_id UUID REFERENCES public.datasets(dataset_id) ON DELETE CASCADE,
    session_id UUID,
    method TEXT NOT NULL, -- "manual", "naive", "kmeans", "dbscan", "agglomerative", "hierarchical"
    hyperparameters JSONB, -- Method-specific parameters (e.g., n_clusters, linkage, etc.)
    results JSONB, -- Sample results (first 50 rows as records)
    summary JSONB, -- Summary statistics (e.g., total_rows, labeled_rows, clusters, etc.)
    labeled_file TEXT NOT NULL, -- Path to the labeled dataset file in storage
    status TEXT NOT NULL DEFAULT 'completed', -- Usually "completed"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.labelings IS 'Stores labeling results and metadata for each labeling operation';
COMMENT ON COLUMN public.labelings.method IS 'Labeling method used: manual, naive, kmeans, dbscan, agglomerative, or hierarchical';
COMMENT ON COLUMN public.labelings.hyperparameters IS 'Method-specific hyperparameters stored as JSON (e.g., {"n_clusters": 3, "linkage": "average"})';
COMMENT ON COLUMN public.labelings.results IS 'Sample results from the labeled dataset (first 50 rows) stored as JSON array of records';
COMMENT ON COLUMN public.labelings.summary IS 'Summary statistics stored as JSON (e.g., {"total_rows": 1000, "labeled_rows": 800, "clusters": 3})';
COMMENT ON COLUMN public.labelings.labeled_file IS 'Path to the labeled dataset file in storage';

-- ============================================
-- Create indexes for better query performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_label_jobs_dataset_id ON public.label_jobs(dataset_id);
CREATE INDEX IF NOT EXISTS idx_label_jobs_session_id ON public.label_jobs(session_id);
CREATE INDEX IF NOT EXISTS idx_label_jobs_status ON public.label_jobs(status);
CREATE INDEX IF NOT EXISTS idx_label_jobs_created_at ON public.label_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_labelings_dataset_id ON public.labelings(dataset_id);
CREATE INDEX IF NOT EXISTS idx_labelings_session_id ON public.labelings(session_id);
CREATE INDEX IF NOT EXISTS idx_labelings_method ON public.labelings(method);
CREATE INDEX IF NOT EXISTS idx_labelings_created_at ON public.labelings(created_at DESC);

