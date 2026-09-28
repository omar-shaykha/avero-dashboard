update public.features set name='ZAYN — Sales Director', description='AVERO AI sales director' where key='ai_sales';
update public.features set name='NAYA — Marketing Director', description='AVERO AI marketing director' where key='ai_marketing';
update public.features set name='ELI — Community Manager', description='AVERO AI community manager' where key='ai_customer_care';
delete from public.company_features where feature_id in (select id from public.features where key in ('ai_hr','ai_inventory','ai_support','ai_analytics','ai_warehouse'));
delete from public.features where key in ('ai_hr','ai_inventory','ai_support','ai_analytics','ai_warehouse');
