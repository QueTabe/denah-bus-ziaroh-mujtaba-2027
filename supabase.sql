-- Jalankan seluruh SQL ini di Supabase > SQL Editor > New query.
create table if not exists public.bus_seats (
  number integer primary key check (number between 1 and 59),
  name text not null default '',
  status text not null default 'available' check (status in ('available','filled','reserved')),
  color text not null default '' check (color in ('','green','yellow','peach')),
  updated_at timestamptz not null default now()
);
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.bus_seats enable row level security;
alter table public.admin_users enable row level security;
drop policy if exists "Public can read bus seats" on public.bus_seats;
create policy "Public can read bus seats" on public.bus_seats
for select to anon, authenticated using (true);
drop policy if exists "Admins can insert bus seats" on public.bus_seats;
create policy "Admins can insert bus seats" on public.bus_seats
for insert to authenticated
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
drop policy if exists "Admins can update bus seats" on public.bus_seats;
create policy "Admins can update bus seats" on public.bus_seats
for update to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
drop policy if exists "Admins can delete bus seats" on public.bus_seats;
create policy "Admins can delete bus seats" on public.bus_seats
for delete to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
drop policy if exists "Users can read own admin status" on public.admin_users;
create policy "Users can read own admin status" on public.admin_users
for select to authenticated using (user_id = (select auth.uid()));
-- Seed data dari DENAH KURSI.pdf halaman 1.
insert into public.bus_seats (number,name,status,color) values
(1, 'Ust. Rovi’I H.', 'filled', 'green'),
(2, 'Ust. Ubaidah', 'filled', 'green'),
(3, 'Gus Faiz', 'filled', 'green'),
(4, 'Abah Mundzir', 'filled', 'green'),
(5, 'Abah Mundzir', 'filled', 'green'),
(6, 'Ust. Muttaqin', 'filled', 'green'),
(7, 'Ust. Sukron F.', 'filled', 'green'),
(8, 'Penderek', 'reserved', 'yellow'),
(9, 'Pelapor', 'reserved', 'yellow'),
(10, 'Pelapor', 'reserved', 'yellow'),
(11, 'Nurul', 'filled', ''),
(12, 'Asfiya’', 'filled', ''),
(13, 'Nahar', 'filled', ''),
(14, 'Nahar', 'filled', ''),
(15, 'Nahar', 'filled', ''),
(16, 'Sela', 'filled', ''),
(17, 'Robi’ah', 'filled', ''),
(18, 'Hariri', 'filled', 'peach'),
(19, 'Nahar', 'filled', 'peach'),
(20, 'Dimas', 'filled', ''),
(21, '', 'available', ''),
(22, '', 'available', ''),
(23, '', 'available', ''),
(24, '', 'available', ''),
(25, 'Pak Khanif', 'filled', ''),
(26, '', 'available', ''),
(27, '', 'available', ''),
(28, '', 'available', ''),
(29, '', 'available', ''),
(30, '', 'available', ''),
(31, '', 'available', ''),
(32, '', 'available', ''),
(33, 'Zaim', 'filled', ''),
(34, 'Mahbub', 'filled', ''),
(35, 'Ihsan', 'filled', ''),
(36, '', 'available', ''),
(37, '', 'available', ''),
(38, 'Fahmi', 'filled', ''),
(39, 'Zaki', 'filled', ''),
(40, 'Qosik', 'filled', ''),
(41, '', 'available', ''),
(42, 'Aria', 'filled', ''),
(43, '', 'available', 'peach'),
(44, 'Akmal', 'filled', ''),
(45, 'Budiman', 'filled', ''),
(46, 'Pak Basyar', 'filled', ''),
(47, 'Pak Slamet', 'filled', ''),
(48, '', 'available', 'peach'),
(49, '', 'available', 'peach'),
(50, '', 'available', 'peach'),
(51, '', 'available', 'peach'),
(52, '', 'available', 'peach'),
(53, '', 'available', 'peach'),
(54, '', 'available', 'peach'),
(55, '', 'available', 'peach'),
(56, '', 'available', 'peach'),
(57, '', 'available', 'peach'),
(58, '', 'available', 'peach'),
(59, '', 'available', 'peach')
on conflict (number) do nothing;
-- Aktifkan realtime untuk tabel bus_seats, aman dijalankan ulang.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bus_seats'
  ) then
    alter publication supabase_realtime add table public.bus_seats;
  end if;
end $$;
