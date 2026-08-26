-- order_items had a SELECT policy (schema.sql: "own order items") but no
-- INSERT policy at all — meaning RLS silently denied every customer's
-- checkout attempt from ever creating its line items, since Postgres RLS
-- defaults to deny when no policy matches the operation. This is the fix.
--
-- Scoped the same way the SELECT policy is: only allowed when the parent
-- order actually belongs to the authenticated customer — not just "any
-- insert allowed," so a customer still can't write line items onto someone
-- else's order.

create policy "customer insert own order items" on order_items
  for insert with check (
    exists (
      select 1 from orders
      where orders.id = order_id
        and orders.customer_id = auth.uid()
    )
  );
