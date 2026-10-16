-- Which agent-assisted method the customer chose at checkout when there was
-- no online payment: bank transfer or Western Union. Null for online
-- (Paystack etc.) payments. Drives the payment instructions on the order
-- page and invoice, and shows on the admin order page.

alter table orders add column if not exists payment_method text
  check (payment_method in ('bank_transfer', 'western_union'));
