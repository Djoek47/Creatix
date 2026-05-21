-- Recreate credit_wallet_reconciliation with SECURITY INVOKER semantics (PostgreSQL 15+).
-- The default (security_invoker = false) runs as the view owner and can bypass RLS for callers.
-- Safe to re-run: replaces the same view with identical columns/query.

CREATE OR REPLACE VIEW public.credit_wallet_reconciliation
WITH (security_invoker = true) AS
SELECT
  w.user_id,
  w.included_credits_remaining,
  w.purchased_credits_remaining,
  (w.included_credits_remaining + w.purchased_credits_remaining) AS wallet_total,
  COALESCE((
    SELECT SUM(
      CASE
        WHEN t.kind = 'credit' THEN t.amount
        WHEN t.kind = 'debit' THEN -t.amount
        WHEN t.kind = 'expire_adjustment' THEN -t.amount
        ELSE 0
      END
    )
    FROM public.credit_transactions t
    WHERE t.user_id = w.user_id
  ), 0) AS ledger_total,
  (
    (w.included_credits_remaining + w.purchased_credits_remaining) -
    COALESCE((
      SELECT SUM(
        CASE
          WHEN t.kind = 'credit' THEN t.amount
          WHEN t.kind = 'debit' THEN -t.amount
          WHEN t.kind = 'expire_adjustment' THEN -t.amount
          ELSE 0
        END
      )
      FROM public.credit_transactions t
      WHERE t.user_id = w.user_id
    ), 0)
  ) AS drift
FROM public.credit_wallets w;

COMMENT ON VIEW public.credit_wallet_reconciliation IS
  'Wallet balance vs sum(transactions) drift check. Uses security_invoker so RLS applies to the querying role.';
