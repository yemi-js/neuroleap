-- Create completed_flashcards table
CREATE TABLE IF NOT EXISTS completed_flashcards (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    completed_date DATE NOT NULL,
    count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, completed_date)
);

-- Create completed_quizzes table
CREATE TABLE IF NOT EXISTS completed_quizzes (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id TEXT NOT NULL,
    completed_date DATE NOT NULL,
    score INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_completed_flashcards_user_date ON completed_flashcards(user_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_completed_quizzes_user_date ON completed_quizzes(user_id, completed_date);

-- Add RLS policies
ALTER TABLE completed_flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_quizzes ENABLE ROW LEVEL SECURITY;

-- Allow users to view and update their own flashcards
CREATE POLICY "Users can view their own flashcards"
    ON completed_flashcards
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcards"
    ON completed_flashcards
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can upsert their own flashcards"
    ON completed_flashcards
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow users to view and create their quiz results
CREATE POLICY "Users can view their own quiz results"
    ON completed_quizzes
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz results"
    ON completed_quizzes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id); 