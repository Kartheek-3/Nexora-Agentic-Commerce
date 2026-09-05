insert into profiles (firebase_uid, email, display_name)
values ('demo_user', 'demo@nexora.ai', 'Demo Merchant')
on conflict (firebase_uid) do update
set email = excluded.email,
    display_name = excluded.display_name,
    updated_at = now();

insert into merchants (owner_profile_id, name)
select id, 'NEXORA Demo Store' from profiles where firebase_uid = 'demo_user'
on conflict (owner_profile_id, name) do nothing;

insert into merchant_guardrails (merchant_id, allowed_product_categories, allowed_agent_tools)
select id, array['Electronics','Fashion','Jewellery','Home','Beauty','Gaming'], array['search_catalog','get_product','compare_products','get_inventory','create_cart','add_cart_item','remove_cart_item','calculate_cart','recommend_cross_sell','recommend_upsell','request_checkout','get_order_status']
from merchants where name = 'NEXORA Demo Store'
on conflict (merchant_id) do update
set allowed_product_categories = excluded.allowed_product_categories,
    allowed_agent_tools = excluded.allowed_agent_tools,
    updated_at = now();

insert into products (merchant_id, sku, name, description, category, price_inr, inventory, attributes, intent_matches)
select m.id, sku, name, description, category, price_inr, inventory, attributes::jsonb, intent_matches
from merchants m,
(values
  ('NEC102','Silver Celestial Necklace','925 silver necklace with moonstone pendant and premium gift finish.','Jewellery',2999,19,'{"material":"925 silver","style":"minimal","occasion":["birthday","anniversary","gift"]}',array['gift under 4000','minimal jewellery','birthday gift']),
  ('JCA210','Premium Jewellery Case','Compact velvet travel case that upgrades the unboxing moment.','Jewellery',699,38,'{"material":"vegan velvet","style":"minimal","occasion":["gift","travel"]}',array['necklace accessory','premium gifting','cross-sell']),
  ('ORB501','Orbit Mechanical Keyboard','Aluminum 75% keyboard with hot-swap switches and low-latency wireless mode.','Gaming',4999,22,'{"layout":"75%","switches":"linear"}',array['gaming setup','keyboard','bundle']),
  ('PLX620','Pulse X Mouse','Lightweight wireless gaming mouse frequently paired with Orbit keyboards.','Gaming',1299,41,'{"weight":"68g","connection":"wireless"}',array['mouse','keyboard accessory','cross-sell'])
) as seed(sku, name, description, category, price_inr, inventory, attributes, intent_matches)
where m.name = 'NEXORA Demo Store'
on conflict (sku) do update
set name = excluded.name,
    description = excluded.description,
    category = excluded.category,
    price_inr = excluded.price_inr,
    inventory = excluded.inventory,
    attributes = excluded.attributes,
    intent_matches = excluded.intent_matches,
    updated_at = now();

insert into customers (merchant_id, email, name)
select m.id, 'customer-' || n || '@example.com', 'Demo Customer ' || n
from merchants m, generate_series(1, 40) n
where m.name = 'NEXORA Demo Store'
on conflict (merchant_id, email) do nothing;

insert into products (merchant_id, sku, name, description, category, price_inr, inventory, attributes, intent_matches)
select
  m.id,
  upper(left(category, 3)) || (300 + n)::text,
  'Nexora ' || category || ' Item ' || n,
  'Realistic ' || lower(category) || ' demo product with agent-readable metadata.',
  category,
  799 + ((n * 431) % 8400),
  8 + ((n * 7) % 51),
  jsonb_build_object('style', case when n % 2 = 0 then 'premium' else 'minimal' end, 'intent', array['gift','bundle','agent-readable']),
  array['agent-readable catalog','available inventory','policy-safe']
from merchants m,
generate_series(1, 44) n,
lateral (select (array['Electronics','Fashion','Jewellery','Home','Beauty','Gaming'])[1 + (n % 6)] as category) c
where m.name = 'NEXORA Demo Store'
on conflict (sku) do update
set name = excluded.name,
    description = excluded.description,
    category = excluded.category,
    price_inr = excluded.price_inr,
    inventory = excluded.inventory,
    attributes = excluded.attributes,
    intent_matches = excluded.intent_matches,
    updated_at = now();

insert into audit_logs (merchant_id, actor_type, event_type, description, input_data, output_data, reason_summary, risk_level, authorization_status, status)
select id, 'agent', 'INTENT_RECEIVED', 'User requested birthday gift under INR 4,000, minimal jewellery.', '{"message":"birthday gift under INR 4000"}', '{"intent":"purchase_gift"}', 'Intent includes recipient, occasion, budget and preference.', 'LOW', 'NOT_REQUIRED', 'COMPLETED'
from merchants
where name = 'NEXORA Demo Store'
  and not exists (
    select 1
    from audit_logs
    where audit_logs.merchant_id = merchants.id
      and audit_logs.event_type = 'INTENT_RECEIVED'
      and audit_logs.description = 'User requested birthday gift under INR 4,000, minimal jewellery.'
  );
