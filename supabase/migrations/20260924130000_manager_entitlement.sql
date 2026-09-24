-- Manager is explicitly enabled by AVERO for each company. Existing companies
-- and new companies start without access until King enables the feature.
insert into public.features (key, name, description)
values ('app_manager', 'AVERO Manager', 'Management dashboard for an entitled company')
on conflict (key) do nothing;
