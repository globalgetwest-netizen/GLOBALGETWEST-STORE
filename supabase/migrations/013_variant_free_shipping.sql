-- Lets specific variants (e.g. a "2-Month Full Package") waive the
-- delivery fee, while other variants of the same or different products
-- (e.g. a "1-Month Package") still charge it normally.
alter table product_variants add column free_shipping boolean not null default false;
