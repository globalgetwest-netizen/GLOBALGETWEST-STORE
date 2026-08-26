-- Adds carrier/service selection captured at checkout, once a real
-- shipping-rate provider (EasyPost) is wired in front of DHL/FedEx/etc.
alter table orders
  add column if not exists shipping_carrier text,
  add column if not exists shipping_service text,
  add column if not exists shipping_rate_id text; -- EasyPost rate id, for label purchase later
