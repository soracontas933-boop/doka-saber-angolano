-- Add internal_route column to popups table
-- This allows popups to navigate to internal site sections (library, work generator, etc.)
ALTER TABLE popups ADD COLUMN IF NOT EXISTS internal_route TEXT;

-- internal_route is nullable: existing popups will have NULL (backward compatible)
-- When set, it stores a path like "/livraria", "/trabalho", "/resumo", etc.
