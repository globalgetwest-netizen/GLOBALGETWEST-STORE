-- The 'staff update orders' RLS policy (schema.sql) allows any staff/admin
-- to update any column on orders — it only checks role, not which fields or
-- values are being changed. The API routes enforce "staff can only set
-- fulfilment statuses and can only assign to themselves" in application
-- code, but that's bypassable by anyone calling Supabase directly with a
-- staff session. This trigger makes the restriction real at the database
-- level, the same way the rest of this schema treats RLS as the actual
-- boundary rather than the API layer.

create function enforce_staff_order_restrictions() returns trigger as $$
declare
  actor_role user_role;
begin
  select role into actor_role from profiles where id = auth.uid();

  -- Admins are unrestricted.
  if actor_role = 'admin' then
    return new;
  end if;

  if actor_role = 'staff' then
    -- Status may only change into a fulfilment-stage value, never into/out
    -- of financial states (paid, pending_payment, cancelled, refunded) —
    -- those are payment-webhook or admin-only actions.
    if new.status is distinct from old.status then
      if new.status not in ('processing', 'fulfilled', 'shipped', 'delivered') then
        raise exception 'Staff cannot set order status to %', new.status;
      end if;
    end if;

    -- Staff may only assign an order to themselves, never to someone else.
    if new.assigned_staff_id is distinct from old.assigned_staff_id then
      if new.assigned_staff_id is distinct from auth.uid() then
        raise exception 'Staff can only assign orders to themselves';
      end if;
    end if;

    -- Staff may not touch financial fields at all.
    if new.total_usd_cents is distinct from old.total_usd_cents
       or new.subtotal_usd_cents is distinct from old.subtotal_usd_cents
       or new.shipping_usd_cents is distinct from old.shipping_usd_cents
       or new.tax_usd_cents is distinct from old.tax_usd_cents
       or new.currency is distinct from old.currency then
      raise exception 'Staff cannot modify order financial fields';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_enforce_staff_order_restrictions
  before update on orders
  for each row execute function enforce_staff_order_restrictions();
