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
