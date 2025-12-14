-- =====================================================
-- Setup Training Tables for ML Pipeline
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Create trained_models table first (referenced by training_jobs)
CREATE TABLE IF NOT EXISTS public.trained_models (
    model_id UUID PRIMARY KEY,
    model_name TEXT,
    session_id UUID,
    dataset_id UUID REFERENCES public.datasets(dataset_id) ON DELETE CASCADE,
    
    algorithm TEXT,  -- knn, naive_bayes, naive_automatic, decision_tree
    hyperparameters JSONB DEFAULT '{}',
    vectorizer JSONB DEFAULT '{}',
    
    model_file TEXT,  -- path to pickled model in storage
    
    train_size INT DEFAULT 0,
    val_size INT DEFAULT 0,
    metrics JSONB DEFAULT '{}',  -- accuracy, precision, recall, f1, confusion_matrix
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment for algorithm field
COMMENT ON COLUMN public.trained_models.algorithm IS 'Supported: knn, naive_bayes, naive_automatic, decision_tree';

-- 2. Create training_jobs table
CREATE TABLE IF NOT EXISTS public.training_jobs (
    job_id UUID PRIMARY KEY,
    model_id UUID REFERENCES public.trained_models(model_id) ON DELETE CASCADE,
    dataset_id UUID,
    session_id UUID,
    
    algorithm TEXT,
    status TEXT DEFAULT 'queued',  -- queued, running, completed, failed
    progress INT DEFAULT 0,
    message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

-- Add comments
COMMENT ON COLUMN public.training_jobs.status IS 'Values: queued, running, completed, failed';
COMMENT ON COLUMN public.training_jobs.algorithm IS 'Supported: knn, naive_bayes, naive_automatic, decision_tree';

-- 3. Create evaluations table
CREATE TABLE IF NOT EXISTS public.evaluations (
    evaluation_id UUID PRIMARY KEY,
    dataset_id UUID REFERENCES public.datasets(dataset_id) ON DELETE CASCADE,
    model_id UUID REFERENCES public.trained_models(model_id) ON DELETE CASCADE,
    session_id UUID,
    
    accuracy FLOAT,
    precision_score FLOAT,
    recall FLOAT,
    f1 FLOAT,
    classification_metrics JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security
ALTER TABLE public.trained_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- 5. Create permissive policies for public access
DO $$
BEGIN
    -- trained_models policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trained_models' AND policyname = 'Allow all access to trained_models') THEN
        CREATE POLICY "Allow all access to trained_models" ON public.trained_models FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    -- training_jobs policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_jobs' AND policyname = 'Allow all access to training_jobs') THEN
        CREATE POLICY "Allow all access to training_jobs" ON public.training_jobs FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    -- evaluations policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'evaluations' AND policyname = 'Allow all access to evaluations') THEN
        CREATE POLICY "Allow all access to evaluations" ON public.evaluations FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trained_models_session ON public.trained_models(session_id);
CREATE INDEX IF NOT EXISTS idx_trained_models_dataset ON public.trained_models(dataset_id);
CREATE INDEX IF NOT EXISTS idx_trained_models_algorithm ON public.trained_models(algorithm);

CREATE INDEX IF NOT EXISTS idx_training_jobs_session ON public.training_jobs(session_id);
CREATE INDEX IF NOT EXISTS idx_training_jobs_dataset ON public.training_jobs(dataset_id);
CREATE INDEX IF NOT EXISTS idx_training_jobs_status ON public.training_jobs(status);
CREATE INDEX IF NOT EXISTS idx_training_jobs_model ON public.training_jobs(model_id);

CREATE INDEX IF NOT EXISTS idx_evaluations_model ON public.evaluations(model_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_dataset ON public.evaluations(dataset_id);

-- 7. Create models storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('models', 'models', true)
ON CONFLICT (id) DO NOTHING;

-- 8. Create storage policy for models bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Allow public access to models'
    ) THEN
        CREATE POLICY "Allow public access to models" ON storage.objects
        FOR ALL USING (bucket_id = 'models') WITH CHECK (bucket_id = 'models');
    END IF;
END $$;

-- =====================================================
-- Verification queries (run these to check setup)
-- =====================================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'trained_models';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'training_jobs';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'evaluations';
-- SELECT * FROM storage.buckets WHERE id = 'models';

