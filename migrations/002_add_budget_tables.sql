-- Migration: Add budget tables for monthly budget tracking
-- Run this in your Supabase SQL Editor

-- Create budget_templates table
CREATE TABLE IF NOT EXISTS budget_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
    lookback_months INTEGER NOT NULL DEFAULT 3 CHECK (lookback_months IN (3, 6, 12)),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure only one active budget per month/year per household (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_templates_unique_active
    ON budget_templates(household_id, month, year)
    WHERE is_active = true;

-- Create budget_items table
CREATE TABLE IF NOT EXISTS budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_template_id UUID NOT NULL REFERENCES budget_templates(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    budgeted_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (budgeted_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Each category can only appear once per budget
    UNIQUE (budget_template_id, category_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_budget_templates_household ON budget_templates(household_id);
CREATE INDEX IF NOT EXISTS idx_budget_templates_month_year ON budget_templates(month, year);
CREATE INDEX IF NOT EXISTS idx_budget_items_template ON budget_items(budget_template_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_category ON budget_items(category_id);

-- Enable Row Level Security
ALTER TABLE budget_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for budget_templates
CREATE POLICY "Users can view budget templates for their household"
    ON budget_templates FOR SELECT
    USING (
        household_id IN (
            SELECT id FROM households WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can insert budget templates for their household"
    ON budget_templates FOR INSERT
    WITH CHECK (
        household_id IN (
            SELECT id FROM households WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update budget templates for their household"
    ON budget_templates FOR UPDATE
    USING (
        household_id IN (
            SELECT id FROM households WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete budget templates for their household"
    ON budget_templates FOR DELETE
    USING (
        household_id IN (
            SELECT id FROM households WHERE created_by = auth.uid()
        )
    );

-- RLS Policies for budget_items
CREATE POLICY "Users can view budget items for their household budgets"
    ON budget_items FOR SELECT
    USING (
        budget_template_id IN (
            SELECT bt.id FROM budget_templates bt
            JOIN households h ON bt.household_id = h.id
            WHERE h.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can insert budget items for their household budgets"
    ON budget_items FOR INSERT
    WITH CHECK (
        budget_template_id IN (
            SELECT bt.id FROM budget_templates bt
            JOIN households h ON bt.household_id = h.id
            WHERE h.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update budget items for their household budgets"
    ON budget_items FOR UPDATE
    USING (
        budget_template_id IN (
            SELECT bt.id FROM budget_templates bt
            JOIN households h ON bt.household_id = h.id
            WHERE h.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete budget items for their household budgets"
    ON budget_items FOR DELETE
    USING (
        budget_template_id IN (
            SELECT bt.id FROM budget_templates bt
            JOIN households h ON bt.household_id = h.id
            WHERE h.created_by = auth.uid()
        )
    );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to budget_templates
DROP TRIGGER IF EXISTS update_budget_templates_updated_at ON budget_templates;
CREATE TRIGGER update_budget_templates_updated_at
    BEFORE UPDATE ON budget_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to budget_items
DROP TRIGGER IF EXISTS update_budget_items_updated_at ON budget_items;
CREATE TRIGGER update_budget_items_updated_at
    BEFORE UPDATE ON budget_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
