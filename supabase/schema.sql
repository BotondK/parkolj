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
  name text not null check (name in ('app_open','dest_selected','here_selected','navigate','start','extend','auto_extend','stop','sms_open','plus_subscribe','feedback')),
  at timestamptz not null,
  lang text check (char_length(lang) <= 5),
  platform text check (char_length(platform) <= 10),
  props jsonb not null default '{}'::jsonb check (pg_column_size(props) < 1000)
);
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
       count(*) filter (where name = 'plus_subscribe') as plusz_elofizetes
from public.events group by 1 order by 1 desc;
revoke all on public.funnel_daily from anon, authenticated;
