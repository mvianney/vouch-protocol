-- Migration 003: Add RPC function for total feedback count aggregation
CREATE OR REPLACE FUNCTION get_total_feedback_count()
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(feedback_count), 0)::bigint FROM agents;
$$;
