-- 016_african_currencies.sql
-- Local-currency GUIDE prices for all 54 African countries.
--
-- 1. Adds every African currency to `currencies` so the daily rate update
--    (/api/cron/fx-rates) can store USD rates for them. is_active = false:
--    these are display-only — checkout still charges in USD (or GHS via
--    Paystack) until a gateway is approved for each currency.
-- 2. latest_fx_rates: the newest rate per currency pair, so the site loads
--    every rate in one query. security_invoker keeps fx_rates RLS in force.

insert into currencies (code, symbol, name, decimal_places, is_active) values
  ('AOA', 'Kz', 'Angolan Kwanza', 2, false),
  ('BIF', 'FBu', 'Burundian Franc', 0, false),
  ('BWP', 'P', 'Botswanan Pula', 2, false),
  ('CDF', 'FC', 'Congolese Franc', 2, false),
  ('CVE', 'Esc', 'Cape Verdean Escudo', 2, false),
  ('DJF', 'Fdj', 'Djiboutian Franc', 0, false),
  ('DZD', 'DA', 'Algerian Dinar', 2, false),
  ('EGP', 'E£', 'Egyptian Pound', 2, false),
  ('ERN', 'Nfk', 'Eritrean Nakfa', 2, false),
  ('ETB', 'Br', 'Ethiopian Birr', 2, false),
  ('GMD', 'D', 'Gambian Dalasi', 2, false),
  ('GNF', 'FG', 'Guinean Franc', 0, false),
  ('KES', 'KSh', 'Kenyan Shilling', 2, false),
  ('KMF', 'CF', 'Comorian Franc', 0, false),
  ('LRD', 'L$', 'Liberian Dollar', 2, false),
  ('LSL', 'L', 'Lesotho Loti', 2, false),
  ('LYD', 'LD', 'Libyan Dinar', 3, false),
  ('MAD', 'DH', 'Moroccan Dirham', 2, false),
  ('MGA', 'Ar', 'Malagasy Ariary', 0, false),
  ('MRU', 'UM', 'Mauritanian Ouguiya', 2, false),
  ('MUR', 'Rs', 'Mauritian Rupee', 2, false),
  ('MWK', 'MK', 'Malawian Kwacha', 2, false),
  ('MZN', 'MT', 'Mozambican Metical', 2, false),
  ('NAD', 'N$', 'Namibian Dollar', 2, false),
  ('RWF', 'FRw', 'Rwandan Franc', 0, false),
  ('SCR', 'SR', 'Seychellois Rupee', 2, false),
  ('SDG', 'SDG', 'Sudanese Pound', 2, false),
  ('SLE', 'Le', 'Sierra Leonean Leone', 2, false),
  ('SOS', 'Sh.So.', 'Somali Shilling', 0, false),
  ('SSP', 'SSP', 'South Sudanese Pound', 2, false),
  ('STN', 'Db', 'São Tomé and Príncipe Dobra', 2, false),
  ('SZL', 'E', 'Swazi Lilangeni', 2, false),
  ('TND', 'DT', 'Tunisian Dinar', 3, false),
  ('TZS', 'TSh', 'Tanzanian Shilling', 2, false),
  ('UGX', 'USh', 'Ugandan Shilling', 0, false),
  ('XAF', 'FCFA', 'Central African CFA Franc', 0, false),
  ('XOF', 'CFA', 'West African CFA Franc', 0, false),
  ('ZAR', 'R', 'South African Rand', 2, false),
  ('ZMW', 'ZK', 'Zambian Kwacha', 2, false),
  ('ZWG', 'ZiG', 'Zimbabwe Gold (ZiG)', 2, false)
on conflict (code) do nothing;

create or replace view latest_fx_rates
with (security_invoker = true) as
select distinct on (base_currency, quote_currency)
  base_currency, quote_currency, rate, source, effective_at
from fx_rates
order by base_currency, quote_currency, effective_at desc;

grant select on latest_fx_rates to anon, authenticated;
