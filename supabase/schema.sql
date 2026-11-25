-- Parkolj: felhasználói adatok (fiók, autók, kedvencek, kártyák utolsó 4 számjeggyel, profilok, előzmények, beállítások).
-- Futtatás: Supabase Dashboard → SQL Editor → ezt a fájlt beilleszteni → Run. Többször is futtatható.

create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Sorszintű jogosultság: mindenki csak a saját sorát látja és írja
alter table public.user_data enable row level security;

drop policy if exists "sajat sor olvasasa" on public.user_data;
create policy "sajat sor olvasasa" on public.user_data for select using (auth.uid() = user_id);

drop policy if exists "sajat sor letrehozasa" on public.user_data;
create policy "sajat sor letrehozasa" on public.user_data for insert with check (auth.uid() = user_id);

drop policy if exists "sajat sor modositasa" on public.user_data;
create policy "sajat sor modositasa" on public.user_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Biztonsági háló: kártyából csak az utolsó 4 számjegy tárolható, teljes kártyaszám nem
alter table public.user_data drop constraint if exists no_full_card_numbers;
alter table public.user_data add constraint no_full_card_numbers check (
  not jsonb_path_exists(data, '$.cards[*] ? (!(@.last4 like_regex "^[0-9]{4}$") || exists(@.number) || exists(@.pan) || exists(@.cvc))')
);

-- Fiók törlése az appból (GDPR): a felhasználó csak a saját fiókját törölheti; az adatsor kaszkádolva törlődik
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Visszajelzések a zárt bétából: bárki küldhet (be nem lépve is), olvasni csak a Dashboardon lehet
create table if not exists public.feedback (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  rating smallint check (rating between 1 and 5),
  message text not null check (char_length(message) between 1 and 4000),
  meta jsonb not null default '{}'::jsonb
);
alter table public.feedback enable row level security;
drop policy if exists "visszajelzes kuldese" on public.feedback;
create policy "visszajelzes kuldese" on public.feedback for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

-- A városnak: anonim összesítés a lezárt parkolásokból (zóna × hét napja × óra, Budapest idő szerint).
-- Csak az a csoport látszik, amelyben legalább 5 parkolás és legalább 3 különböző felhasználó van; egyedi út nem azonosítható.
create or replace function public.city_stats()
returns table (zone_id text, dow int, hour int, sessions int, users int, avg_minutes int, total_ft bigint)
language sql stable security definer set search_path = '' as $$
  with h as (
    select u.user_id,
           x->>'zoneId' as zone_id,
           (to_timestamp((x->>'startedAt')::double precision / 1000) at time zone 'Europe/Budapest') as t,
           coalesce((x->>'minutes')::int, 0) as minutes,
           coalesce((x->>'cost')::int, 0) as cost
    from public.user_data u, jsonb_array_elements(coalesce(u.data->'history', '[]'::jsonb)) x
    where x->>'zoneId' is not null and x->>'startedAt' is not null
  )
  select zone_id, extract(isodow from t)::int, extract(hour from t)::int,
         count(*)::int, count(distinct user_id)::int, round(avg(minutes))::int, sum(cost)::bigint
  from h
  group by 1, 2, 3
  having count(*) >= 5 and count(distinct user_id) >= 3
  order by 1, 2, 3;
$$;
revoke all on function public.city_stats() from public;
grant execute on function public.city_stats() to anon, authenticated;

-- Névtelen használati statisztika a zárt bétához: nincs felhasználói azonosító; bárki beküldhet, olvasni csak a Dashboardon lehet.
create table if not exists public.events (
  id bigserial primary key,
  received_at timestamptz not null default now(),
  sid uuid not null,
  name text not null check (name in ('app_open','dest_selected','here_selected','navigate','start','extend','auto_extend','stop','sms_open','plus_subscribe','feedback','widget')),
  at timestamptz not null,
  lang text check (char_length(lang) <= 5),
  platform text check (char_length(platform) <= 10),
  props jsonb not null default '{}'::jsonb check (pg_column_size(props) < 1000)
);
-- Az eseménynevek listája bővülhet: a régi ellenőrzést frissítjük (újrafuttatható)
alter table public.events drop constraint if exists events_name_check;
alter table public.events add constraint events_name_check check (name in ('app_open','dest_selected','here_selected','navigate','start','extend','auto_extend','stop','sms_open','plus_subscribe','feedback','widget'));
alter table public.events enable row level security;
drop policy if exists "esemeny kuldese" on public.events;
create policy "esemeny kuldese" on public.events for insert to anon, authenticated with check (true);
create index if not exists events_at_idx on public.events (at);
grant insert on public.events to anon, authenticated;
grant usage on sequence public.events_id_seq to anon, authenticated;

-- Napi tölcsér (Dashboard → SQL: select * from public.funnel_daily;): hány alkalom jutott el az egyes lépésekig
create or replace view public.funnel_daily with (security_invoker = true) as
select (at at time zone 'Europe/Budapest')::date as nap,
       count(distinct sid) filter (where name = 'app_open') as megnyitas,
       count(distinct sid) filter (where name in ('dest_selected','here_selected')) as celpont,
       count(distinct sid) filter (where name = 'navigate') as navigacio,
       count(distinct sid) filter (where name = 'start') as inditas,
       count(distinct sid) filter (where name = 'stop') as leallitas,
       count(*) filter (where name = 'sms_open') as sms,
       count(*) filter (where name = 'plus_subscribe') as plusz_elofizetes,
       count(*) filter (where name = 'widget') as widget
from public.events group by 1 order by 1 desc;
revoke all on public.funnel_daily from anon, authenticated;

-- Jelentkezés a zárt bétára (webes oldal: ?beta). Csak a béta meghívóhoz; a béta végén törlendő.
-- Közvetlen táblajog nincs: az anon kulcs csak a beta_signup függvényt hívhatja, olvasni nem tud.
create table if not exists public.beta_signups (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  email text not null unique check (email = lower(email) and char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  platform text not null check (platform in ('ios','android','web')),
  freq text not null check (freq in ('daily','weekly','monthly','rarely')),
  who text not null check (who in ('resident','commuter','visitor')),
  lang text check (char_length(lang) <= 5),
  invited_at timestamptz
);
alter table public.beta_signups enable row level security;
revoke all on public.beta_signups from anon, authenticated;

create or replace function public.beta_signup(p_email text, p_platform text, p_freq text, p_who text, p_lang text)
returns void language sql security definer set search_path = public as $$
  insert into public.beta_signups (email, platform, freq, who, lang)
  values (lower(trim(p_email)), p_platform, p_freq, p_who, left(p_lang, 5))
  on conflict (email) do nothing;
$$;
revoke all on function public.beta_signup(text, text, text, text, text) from public;
grant execute on function public.beta_signup(text, text, text, text, text) to anon, authenticated;

-- Áttekintés (Dashboard → SQL: select * from public.beta_summary;) és a meghívandók: select email from public.beta_signups where invited_at is null;
create or replace view public.beta_summary with (security_invoker = true) as
select platform, who, freq, count(*) as fo, count(*) filter (where invited_at is not null) as meghivva
from public.beta_signups group by 1, 2, 3 order by 4 desc;
revoke all on public.beta_summary from anon, authenticated;

-- „Nem volt hely” és „Hibás adat” jelzések (a felhasználó maga küldi). Nincs felhasználói azonosító, rendszám;
-- a hely kb. 100 m-re kerekítve. Kívülről csak írható; az összesítő a Dashboardon olvasható, és a BKK-nak adható át.
create table if not exists public.spot_reports (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  at timestamptz not null,
  kind text not null check (kind in ('nospace','wrongzone','wrongprice','notpaid','other')),
  zone_id text check (zone_id is null or zone_id ~ '^[A-D]$'),
  district text check (district is null or char_length(district) <= 40),
  option_kind text check (option_kind is null or option_kind in ('fastest','cheapest','garage','here')),
  lat numeric(6,3) not null check (lat between 47.3 and 47.7),
  lng numeric(6,3) not null check (lng between 18.9 and 19.4),
  note text check (note is null or char_length(note) <= 300),
  lang text not null check (lang in ('hu','en','de'))
);
alter table public.spot_reports enable row level security;
drop policy if exists "jelzes kuldese" on public.spot_reports;
create policy "jelzes kuldese" on public.spot_reports for insert to anon, authenticated with check (true);
revoke all on public.spot_reports from anon, authenticated;
grant insert on public.spot_reports to anon, authenticated;
grant usage on sequence public.spot_reports_id_seq to anon, authenticated;

-- Áttekintés: select * from public.spot_report_summary;  (zóna × jelzés × óra, Budapest idő szerint)
create or replace view public.spot_report_summary with (security_invoker = true) as
  select zone_id, kind, extract(hour from at at time zone 'Europe/Budapest')::int as hour, count(*) as reports, max(at) as last_at
  from public.spot_reports group by 1, 2, 3 order by reports desc;
revoke all on public.spot_report_summary from anon, authenticated;

-- „Nem volt hely” forró pontok: ~100 m-es cella × 3 órás sáv (Budapest idő), az elmúlt 60 napból.
-- Csak ahol legalább 3 jelzés van legalább 2 különböző napról (egy ember ismételt jelzése így nem elég).
-- Bárki olvashatja (az app ezzel becsüli a szabad hely esélyét, a „Városnak” oldal ebből mutatja).
create or replace function public.nospace_hotspots()
returns table (lat numeric, lng numeric, zone_id text, hour_from int, reports int, last_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.lat, r.lng, max(r.zone_id), (extract(hour from r.at at time zone 'Europe/Budapest')::int / 3) * 3,
         count(*)::int, max(r.at)
  from public.spot_reports r
  where r.kind = 'nospace' and r.at > now() - interval '60 days'
  group by r.lat, r.lng, 4
  having count(*) >= 3 and count(distinct (r.at at time zone 'Europe/Budapest')::date) >= 2
  order by 5 desc
  limit 2000;
$$;
revoke all on function public.nospace_hotspots() from public;
grant execute on function public.nospace_hotspots() to anon, authenticated;

-- Névtelen hibajelentés (összeomlás) a zárt bétához. Nincs felhasználói azonosító; az üzenetből az app előre kiszűri
-- a rendszámot, e-mailt, számokat, koordinátát és URL-t. Kívülről csak írható; 90 nap után törölhető (lásd lent).
create table if not exists public.app_errors (
  id bigserial primary key,
  received_at timestamptz not null default now(),
  sid uuid not null,
  at timestamptz not null,
  kind text not null check (kind in ('render','global','promise')),
  name text not null check (char_length(name) <= 40),
  message text not null check (char_length(message) <= 200),
  stack text not null check (char_length(stack) <= 600),
  fp text not null check (fp ~ '^[0-9a-f]{8}$'),
  version text not null check (char_length(version) <= 20),
  platform text not null check (char_length(platform) <= 10),
  lang text not null check (char_length(lang) <= 5),
  screen text not null check (char_length(screen) <= 20)
);
alter table public.app_errors enable row level security;
drop policy if exists "hiba kuldese" on public.app_errors;
create policy "hiba kuldese" on public.app_errors for insert to anon, authenticated with check (true);
revoke all on public.app_errors from anon, authenticated;
grant insert on public.app_errors to anon, authenticated;
grant usage on sequence public.app_errors_id_seq to anon, authenticated;
create index if not exists app_errors_at_idx on public.app_errors (at);

-- Leggyakoribb hibák (Dashboard → SQL: select * from public.error_summary;)
-- Régiek törlése: delete from public.app_errors where at < now() - interval '90 days';
create or replace view public.error_summary with (security_invoker = true) as
  select fp, name, max(message) as message, max(stack) as stack, count(*) as db, count(distinct sid) as alkalom,
         array_agg(distinct screen) as kepernyok, array_agg(distinct platform) as platformok, max(version) as verzio, max(at) as utoljara
  from public.app_errors group by fp, name order by db desc;
revoke all on public.error_summary from anon, authenticated;

-- Lejárati értesítés a bezárt webappnak (Web Push). Az app a parkolás indításakor beküldi, mikor szóljon (legfeljebb 4 időpont,
-- 26 órán belül), és a böngésző push-címét. Nincs felhasználói azonosító, rendszám vagy hely; a sor kiküldés után, leállításkor vagy
-- egy óra késés után törlődik. Kívülről sem olvasni, sem írni nem lehet közvetlenül: csak a push_schedule és push_cancel függvény hívható.
create table if not exists public.push_jobs (
  id bigserial primary key,
  token uuid not null,
  endpoint text not null check (endpoint ~ '^https://' and char_length(endpoint) <= 800),
  p256dh text not null check (char_length(p256dh) between 80 and 100),
  auth text not null check (char_length(auth) between 16 and 30),
  send_at timestamptz not null,
  title text not null check (char_length(title) <= 60),
  body text not null check (char_length(body) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists push_jobs_send_at_idx on public.push_jobs (send_at);
create index if not exists push_jobs_token_idx on public.push_jobs (token);
alter table public.push_jobs enable row level security;
revoke all on public.push_jobs from anon, authenticated;

-- Ütemezés: a token (az app véletlen azonosítója a parkoláshoz) és a push-cím korábbi időpontjait lecseréli
create or replace function public.push_schedule(p_token uuid, p_endpoint text, p_p256dh text, p_auth text, p_jobs jsonb)
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if jsonb_typeof(p_jobs) <> 'array' or jsonb_array_length(p_jobs) > 4 then raise exception 'legfeljebb 4 időpont'; end if;
  delete from public.push_jobs where token = p_token or endpoint = p_endpoint;
  insert into public.push_jobs (token, endpoint, p256dh, auth, send_at, title, body)
    select p_token, p_endpoint, p_p256dh, p_auth, j.at, left(j.title, 60), left(j.body, 200)
    from jsonb_to_recordset(p_jobs) as j(at timestamptz, title text, body text)
    where j.at > now() and j.at < now() + interval '26 hours' and j.title is not null and j.body is not null;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.push_schedule(uuid, text, text, text, jsonb) from public;
grant execute on function public.push_schedule(uuid, text, text, text, jsonb) to anon, authenticated;

-- Leállításkor: csak aki ismeri a tokent, az törölheti
create or replace function public.push_cancel(p_token uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.push_jobs where token = p_token;
$$;
revoke all on function public.push_cancel(uuid) from public;
grant execute on function public.push_cancel(uuid) to anon, authenticated;

-- A küldő (Edge Function, service_role) kiveszi az esedékeseket; a nagyon régieket is törli
create or replace function public.push_take_due()
returns setof public.push_jobs language sql security definer set search_path = '' as $$
  delete from public.push_jobs where send_at <= now() + interval '20 seconds' returning *;
$$;
revoke all on function public.push_take_due() from public, anon, authenticated;
grant execute on function public.push_take_due() to service_role;

-- Megszűnt feliratkozás (a push szolgáltatás 404/410-et adott): minden időpontja törlődik
create or replace function public.push_forget(p_endpoint text)
returns void language sql security definer set search_path = '' as $$
  delete from public.push_jobs where endpoint = p_endpoint;
$$;
revoke all on function public.push_forget(text) from public, anon, authenticated;
grant execute on function public.push_forget(text) to service_role;
