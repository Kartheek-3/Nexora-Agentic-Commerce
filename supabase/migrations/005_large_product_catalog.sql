begin;

with demo_profile as (
  insert into profiles (firebase_uid, email, display_name)
  values ('demo_user', 'demo@nexora.ai', 'Demo Merchant')
  on conflict (firebase_uid) do update
  set email = excluded.email,
      display_name = excluded.display_name,
      updated_at = now()
  returning id
),
merchant_seed(name, max_transaction) as (
  values
    ('NEXORA Demo Store', 10000),
    ('Orbit Tech', 100000),
    ('Arclight Home', 150000),
    ('Velora Fashion', 35000),
    ('Northstar Fitness', 90000),
    ('Aura Beauty', 25000),
    ('Trailworks', 70000),
    ('Paper & Pixel', 20000),
    ('Lumen Living', 120000),
    ('Nova Gear', 90000),
    ('Studio Forma', 60000),
    ('DailyKind Market', 30000)
)
insert into merchants (owner_profile_id, name, razorpay_account_mode)
select demo_profile.id, merchant_seed.name, 'test'
from demo_profile, merchant_seed
on conflict (owner_profile_id, name) do update
set razorpay_account_mode = excluded.razorpay_account_mode,
    updated_at = now();

with merchant_policy(name, max_transaction) as (
  values
    ('NEXORA Demo Store', 10000),
    ('Orbit Tech', 100000),
    ('Arclight Home', 150000),
    ('Velora Fashion', 35000),
    ('Northstar Fitness', 90000),
    ('Aura Beauty', 25000),
    ('Trailworks', 70000),
    ('Paper & Pixel', 20000),
    ('Lumen Living', 120000),
    ('Nova Gear', 90000),
    ('Studio Forma', 60000),
    ('DailyKind Market', 30000)
)
insert into merchant_guardrails (
  merchant_id,
  maximum_transaction_value,
  maximum_recommended_cart_value,
  allowed_product_categories,
  allowed_agent_tools,
  require_payment_authorization
)
select
  m.id,
  merchant_policy.max_transaction,
  least(merchant_policy.max_transaction, 50000),
  array['Electronics','Computers & Accessories','Gaming','Mobile Accessories','Fashion - Men','Fashion - Women','Footwear','Jewellery','Beauty & Personal Care','Home & Kitchen','Furniture & Decor','Fitness & Sports','Travel','Books & Stationery','Toys & Games','Automotive Accessories','Pet Supplies','Gifts','Smart Home','Audio','Photography','Office Products','Health & Wellness','Outdoor & Adventure'],
  array['search_catalog','get_product','compare_products','get_inventory','create_cart','add_cart_item','remove_cart_item','calculate_cart','recommend_cross_sell','recommend_upsell','request_checkout','get_order_status'],
  true
from merchant_policy
join merchants m on m.name = merchant_policy.name
on conflict (merchant_id) do update
set maximum_transaction_value = excluded.maximum_transaction_value,
    maximum_recommended_cart_value = excluded.maximum_recommended_cart_value,
    allowed_product_categories = excluded.allowed_product_categories,
    allowed_agent_tools = excluded.allowed_agent_tools,
    require_payment_authorization = true,
    updated_at = now();

with category_seed(category, prefix, total, min_price, max_price, merchant_name, nouns, tags) as (
  values
    ('Electronics','ELE',100,999,89999,'Orbit Tech',array['Power Hub','Mini Projector','Smart Display','Desk Monitor','Action Hub'],array['electronics','gift','premium']),
    ('Computers & Accessories','CMP',100,499,79999,'Orbit Tech',array['Mechanical Keyboard','USB-C Dock','Laptop Stand','NVMe Enclosure','Webcam'],array['computer','workspace','setup']),
    ('Gaming','GAM',80,799,49999,'Nova Gear',array['Wireless Mouse','TKL Keyboard','Controller','Gaming Headset','Desk Mat'],array['gaming','bundle','low latency']),
    ('Mobile Accessories','MOB',100,199,4999,'Orbit Tech',array['GaN Charger','MagSafe Case','Power Bank','Braided Cable','Phone Grip'],array['mobile','charger','travel']),
    ('Fashion - Men','FMN',100,399,12999,'Velora Fashion',array['Oxford Shirt','Merino Polo','Slim Chinos','Linen Jacket','Travel Hoodie'],array['menswear','minimal','office']),
    ('Fashion - Women','FWN',100,399,12999,'Velora Fashion',array['Satin Blouse','Pleated Dress','Cotton Kurta','Tailored Blazer','Evening Wrap'],array['womenswear','gift','minimal']),
    ('Footwear','FTW',70,699,15999,'Velora Fashion',array['Street Sneaker','Leather Loafer','Trail Sandal','Running Shoe','Block Heel'],array['footwear','comfort','style']),
    ('Jewellery','JWL',60,499,39999,'NEXORA Demo Store',array['Silver Pendant','Pearl Earrings','Gold Bracelet','Minimal Ring','Jewellery Case'],array['jewellery','birthday gift','minimal']),
    ('Beauty & Personal Care','BTY',70,199,6999,'Aura Beauty',array['Vitamin C Serum','Hydration Mask','Matte Lip Tint','Body Mist','Scalp Tonic'],array['beauty','self care','gift']),
    ('Home & Kitchen','HOM',100,299,49999,'Arclight Home',array['Chef Pan','Storage Set','Coffee Brewer','Dinner Set','Air Purifier'],array['home','kitchen','daily']),
    ('Furniture & Decor','FUR',50,1999,89999,'Lumen Living',array['Accent Chair','Standing Desk','Oak Shelf','Pendant Lamp','Console Table'],array['furniture','decor','premium']),
    ('Fitness & Sports','FIT',60,499,59999,'Northstar Fitness',array['Yoga Mat','Adjustable Dumbbell','Smart Scale','Spin Bike','Training Bench'],array['fitness','health','training']),
    ('Travel','TRV',40,399,24999,'Trailworks',array['Carry-On Suitcase','Travel Backpack','Packing Cube','Neck Pillow','Duffle Bag'],array['travel','outdoor','gift']),
    ('Books & Stationery','BKS',60,99,3999,'Paper & Pixel',array['Planner','Fountain Pen','Sketchbook','Desk Notebook','Reading Lamp'],array['stationery','office','student']),
    ('Toys & Games','TOY',50,199,9999,'DailyKind Market',array['Strategy Game','STEM Kit','Puzzle Box','Craft Set','Building Blocks'],array['toys','family','kids']),
    ('Automotive Accessories','AUT',40,299,19999,'Nova Gear',array['Dash Camera','Car Charger','Tyre Inflator','Seat Organizer','Phone Mount'],array['automotive','car','utility']),
    ('Pet Supplies','PET',30,199,7999,'DailyKind Market',array['Pet Bed','Slow Feeder','Grooming Brush','Travel Bowl','Chew Toy'],array['pets','home','daily']),
    ('Gifts','GFT',50,299,9999,'NEXORA Demo Store',array['Gift Hamper','Keepsake Box','Scented Candle','Desk Plant','Memory Frame'],array['gift','birthday','premium']),
    ('Smart Home','SMH',40,799,29999,'Lumen Living',array['Smart Bulb','Video Doorbell','Sensor Kit','Smart Plug','Climate Hub'],array['smart home','automation','security']),
    ('Audio','AUD',50,499,59999,'Orbit Tech',array['ANC Headphones','Bluetooth Speaker','USB Microphone','Soundbar','Earbuds'],array['audio','music','premium']),
    ('Photography','PHO',30,799,89999,'Studio Forma',array['Tripod','Camera Sling','LED Panel','Memory Card','Lens Filter'],array['photography','creator','travel']),
    ('Office Products','OFC',50,149,29999,'Paper & Pixel',array['Desk Organizer','Task Chair','Monitor Arm','Whiteboard','Label Maker'],array['office','workspace','productivity']),
    ('Health & Wellness','HLW',50,199,14999,'Northstar Fitness',array['Massager','Sleep Mask','Air Humidifier','Posture Corrector','Wellness Journal'],array['health','wellness','self care']),
    ('Outdoor & Adventure','OUT',40,499,39999,'Trailworks',array['Trekking Pole','Camp Light','Rain Jacket','Hydration Pack','Trail Stove'],array['outdoor','adventure','travel'])
),
generated as (
  select
    c.category,
    c.prefix || lpad(n::text, 4, '0') as sku,
    (array['Nova','Arc','Luma','Terra','Pulse','Aero','Mira','Urban','North','Vela'])[1 + ((n + length(c.prefix)) % 10)] || ' ' ||
      c.nouns[1 + ((n - 1) % array_length(c.nouns, 1))] || ' ' ||
      (array['Essential','Pro','Lite','Studio','Prime','Flex','Air','Max'])[1 + ((n * 3) % 8)] as name,
    c.merchant_name,
    c.min_price + (((n * 137) % greatest(c.max_price - c.min_price, 1)) / 100) * 100 + 99 as price_inr,
    case
      when n % 20 = 0 then 0
      when n % 7 = 0 then 1 + (n % 5)
      when n % 5 = 0 then 100 + (n % 180)
      else 6 + (n % 95)
    end as inventory,
    c.tags,
    n
  from category_seed c
  cross join lateral generate_series(1, c.total) n
)
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
  g.sku,
  g.name,
  g.name || ' for ' || lower(g.category) || ' shoppers who need reliable, gift-ready commerce recommendations.',
  g.category,
  g.price_inr,
  g.inventory,
  jsonb_build_object(
    'brand', split_part(g.name, ' ', 1),
    'features', array['agent-readable metadata','reliable availability','gift-ready packaging'],
    'use_cases', g.tags,
    'target_customers', array['online shoppers','agentic buyers','premium retail customers'],
    'seed_source', '005_large_product_catalog'
  ),
  g.tags,
  g.n % 25 <> 0
from generated g
join merchants m on m.name = g.merchant_name
on conflict (sku) do update
set merchant_id = excluded.merchant_id,
    name = excluded.name,
    description = excluded.description,
    category = excluded.category,
    price_inr = excluded.price_inr,
    inventory = excluded.inventory,
    attributes = excluded.attributes,
    intent_matches = excluded.intent_matches,
    active = excluded.active,
    updated_at = now();

commit;
