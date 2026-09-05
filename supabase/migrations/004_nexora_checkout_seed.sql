begin;

with demo_profile as (
  insert into profiles (firebase_uid, email, display_name)
  values ('demo_user', 'demo@nexora.ai', 'Demo Merchant')
  on conflict (firebase_uid) do update
  set email = excluded.email,
      display_name = excluded.display_name,
      updated_at = now()
  returning id
)
insert into merchants (owner_profile_id, name, razorpay_account_mode)
select id, 'NEXORA Demo Store', 'test'
from demo_profile
on conflict (owner_profile_id, name) do update
set razorpay_account_mode = excluded.razorpay_account_mode,
    updated_at = now();

insert into merchant_guardrails (
  merchant_id,
  maximum_transaction_value,
  maximum_recommended_cart_value,
  allowed_product_categories,
  allowed_agent_tools,
  require_payment_authorization
)
select
  id,
  10000,
  8000,
  array['Electronics','Fashion','Jewellery','Home','Beauty','Gaming'],
  array['search_catalog','get_product','compare_products','get_inventory','create_cart','add_cart_item','remove_cart_item','calculate_cart','recommend_cross_sell','recommend_upsell','request_checkout','get_order_status'],
  true
from merchants
where name = 'NEXORA Demo Store'
  and owner_profile_id = (
    select id
    from profiles
    where firebase_uid = 'demo_user'
  )
on conflict (merchant_id) do update
set maximum_transaction_value = excluded.maximum_transaction_value,
    maximum_recommended_cart_value = excluded.maximum_recommended_cart_value,
    allowed_product_categories = excluded.allowed_product_categories,
    allowed_agent_tools = excluded.allowed_agent_tools,
    require_payment_authorization = excluded.require_payment_authorization,
    updated_at = now();

insert into products (
  merchant_id,
  sku,
  name,
  description,
  category,
  price_inr,
  inventory,
  attributes,
  intent_matches,
  active
)
select
  m.id,
  seed.sku,
  seed.name,
  seed.description,
  'Jewellery',
  seed.price_inr,
  seed.inventory,
  seed.attributes::jsonb,
  seed.intent_matches,
  true
from merchants m,
(values
  ('NEC102', 'Silver Celestial Necklace', '925 silver necklace with moonstone pendant and premium gift finish.', 2999, 19, '{"material":"925 silver","style":"minimal","occasion":["birthday","anniversary","gift"]}', array['gift under 4000','minimal jewellery','birthday gift']),
  ('JCA210', 'Premium Jewellery Case', 'Compact velvet travel case that upgrades the unboxing moment.', 699, 38, '{"material":"vegan velvet","style":"minimal","occasion":["gift","travel"]}', array['necklace accessory','premium gifting','cross-sell'])
) as seed(sku, name, description, price_inr, inventory, attributes, intent_matches)
where m.name = 'NEXORA Demo Store'
  and m.owner_profile_id = (
    select id
    from profiles
    where firebase_uid = 'demo_user'
  )
on conflict (sku) do update
set merchant_id = excluded.merchant_id,
    name = excluded.name,
    description = excluded.description,
    category = excluded.category,
    price_inr = excluded.price_inr,
    inventory = greatest(products.inventory, excluded.inventory),
    attributes = excluded.attributes,
    intent_matches = excluded.intent_matches,
    active = true,
    updated_at = now();

commit;

-- Verification queries for Supabase SQL Editor:
-- select id, name from merchants where name = 'NEXORA Demo Store';
--
-- select id, merchant_id, sku, name, price_inr, inventory, active
-- from products
-- where sku in ('NEC102','JCA210')
-- order by sku;
--
-- select m.name, p.sku, p.name, p.price_inr
-- from merchants m
-- join products p on p.merchant_id = m.id
-- where m.name = 'NEXORA Demo Store'
--   and p.sku in ('NEC102','JCA210')
-- order by p.sku;
--
-- select mg.*
-- from merchant_guardrails mg
-- join merchants m on m.id = mg.merchant_id
-- where m.name = 'NEXORA Demo Store';
--
-- select count(*) from merchants;
-- select count(*) from products;
-- select count(*) from merchant_guardrails;
--
-- select count(*) as demo_merchant_count
-- from merchants
-- where name = 'NEXORA Demo Store';
--
-- select count(*) as required_product_count
-- from products
-- where sku in ('NEC102','JCA210');
