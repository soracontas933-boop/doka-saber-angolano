-- Add fraud_analysis column to payment_requests table
-- This column will store the result of the AI fraud detection service
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS fraud_analysis JSONB DEFAULT NULL;

-- Add index for performance on suspicious payments
CREATE INDEX IF NOT EXISTS idx_payment_requests_fraud ON payment_requests ((fraud_analysis->>'isSuspicious')) WHERE fraud_analysis IS NOT NULL;
