-- ══════════════════════════════════════════════════════════════
--  schema.sql — Keuangan Kelasku
--  Cara pakai: Supabase → SQL Editor → New Query → Paste → Run
--  Aman dijalankan berulang kali (idempotent)
-- ══════════════════════════════════════════════════════════════

-- ── Aktifkan ekstensi uuid ────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ══════════════════════════════════════════════════════════════
--  TABEL: profiles
-- ══════════════════════════════════════════════════════════════
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nama        text        not null,
  email       text        not null,
  role        text        not null default 'siswa'
                check (role in ('siswa','bendahara')),
  aktif       boolean     not null default true,
  nis         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Trigger: auto-buat profil saat user baru sign up ─────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nama, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nama', split_part(new.email,'@',1)),
    new.email,
    'siswa'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Trigger: auto-update timestamp ───────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ══════════════════════════════════════════════════════════════
--  TABEL: transaksi
-- ══════════════════════════════════════════════════════════════
create table if not exists public.transaksi (
  id          uuid primary key default uuid_generate_v4(),
  tgl         date        not null,
  jenis       text        not null check (jenis in ('masuk','keluar')),
  kategori    text        not null,
  keterangan  text        not null,
  nominal     bigint      not null check (nominal > 0),
  created_by  uuid        references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists transaksi_updated_at on public.transaksi;
create trigger transaksi_updated_at
  before update on public.transaksi
  for each row execute procedure public.set_updated_at();

-- ══════════════════════════════════════════════════════════════
--  TABEL: iuran
-- ══════════════════════════════════════════════════════════════
create table if not exists public.iuran (
  id          uuid primary key default uuid_generate_v4(),
  siswa_id    uuid        not null references public.profiles(id) on delete cascade,
  bulan       text        not null,
  nominal     bigint      not null default 10000,
  status      text        not null default 'belum' check (status in ('lunas','belum')),
  tgl_bayar   date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (siswa_id, bulan)
);

drop trigger if exists iuran_updated_at on public.iuran;
create trigger iuran_updated_at
  before update on public.iuran
  for each row execute procedure public.set_updated_at();

-- ══════════════════════════════════════════════════════════════
--  TABEL: kegiatan
-- ══════════════════════════════════════════════════════════════
create table if not exists public.kegiatan (
  id          uuid primary key default uuid_generate_v4(),
  nama        text        not null,
  nominal     bigint      not null check (nominal > 0),
  tgl         date        not null,
  deskripsi   text,
  created_by  uuid        references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists kegiatan_updated_at on public.kegiatan;
create trigger kegiatan_updated_at
  before update on public.kegiatan
  for each row execute procedure public.set_updated_at();

-- ══════════════════════════════════════════════════════════════
--  TABEL: kegiatan_bayar
-- ══════════════════════════════════════════════════════════════
create table if not exists public.kegiatan_bayar (
  id           uuid primary key default uuid_generate_v4(),
  kegiatan_id  uuid        not null references public.kegiatan(id) on delete cascade,
  siswa_id     uuid        not null references public.profiles(id) on delete cascade,
  status       text        not null default 'belum' check (status in ('lunas','belum')),
  tgl_bayar    date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (kegiatan_id, siswa_id)
);

drop trigger if exists kegiatan_bayar_updated_at on public.kegiatan_bayar;
create trigger kegiatan_bayar_updated_at
  before update on public.kegiatan_bayar
  for each row execute procedure public.set_updated_at();

-- ══════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY (RLS)
--  DROP dulu semua policy agar bisa dijalankan berulang kali
-- ══════════════════════════════════════════════════════════════

-- ── profiles ─────────────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "profiles: semua user login bisa baca"    on public.profiles;
drop policy if exists "profiles: user update milik sendiri"     on public.profiles;

create policy "profiles: semua user login bisa baca"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: user update milik sendiri"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- ── transaksi ─────────────────────────────────────────────────
alter table public.transaksi enable row level security;

drop policy if exists "transaksi: semua user login bisa baca"   on public.transaksi;
drop policy if exists "transaksi: hanya bendahara bisa tambah"  on public.transaksi;
drop policy if exists "transaksi: hanya bendahara bisa update"  on public.transaksi;
drop policy if exists "transaksi: hanya bendahara bisa hapus"   on public.transaksi;

create policy "transaksi: semua user login bisa baca"
  on public.transaksi for select
  to authenticated
  using (true);

create policy "transaksi: hanya bendahara bisa tambah"
  on public.transaksi for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'bendahara')
  );

create policy "transaksi: hanya bendahara bisa update"
  on public.transaksi for update
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'bendahara')
  );

create policy "transaksi: hanya bendahara bisa hapus"
  on public.transaksi for delete
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'bendahara')
  );

-- ── iuran ─────────────────────────────────────────────────────
alter table public.iuran enable row level security;

drop policy if exists "iuran: semua user login bisa baca"       on public.iuran;
drop policy if exists "iuran: hanya bendahara bisa tambah"      on public.iuran;
drop policy if exists "iuran: hanya bendahara bisa update"      on public.iuran;
drop policy if exists "iuran: hanya bendahara bisa hapus"       on public.iuran;

create policy "iuran: semua user login bisa baca"
  on public.iuran for select
  to authenticated
  using (true);

create policy "iuran: hanya bendahara bisa tambah"
  on public.iuran for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'bendahara')
  );

create policy "iuran: hanya bendahara bisa update"
  on public.iuran for update
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'bendahara')
  );

create policy "iuran: hanya bendahara bisa hapus"
  on public.iuran for delete
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'bendahara')
  );

-- ── kegiatan ─────────────────────────────────────────────────
alter table public.kegiatan enable row level security;

drop policy if exists "kegiatan: semua user login bisa baca"    on public.kegiatan;
drop policy if exists "kegiatan: hanya bendahara bisa tambah"   on public.kegiatan;
drop policy if exists "kegiatan: hanya bendahara bisa update"   on public.kegiatan;
drop policy if exists "kegiatan: hanya bendahara bisa hapus"    on public.kegiatan;

create policy "kegiatan: semua user login bisa baca"
  on public.kegiatan for select
  to authenticated
  using (true);

create policy "kegiatan: hanya bendahara bisa tambah"
  on public.kegiatan for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'bendahara')
  );

create policy "kegiatan: hanya bendahara bisa update"
  on public.kegiatan for update
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'bendahara')
  );

create policy "kegiatan: hanya bendahara bisa hapus"
  on public.kegiatan for delete
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'bendahara')
  );

-- ── kegiatan_bayar ────────────────────────────────────────────
alter table public.kegiatan_bayar enable row level security;

drop policy if exists "kegiatan_bayar: semua user login bisa baca"   on public.kegiatan_bayar;
drop policy if exists "kegiatan_bayar: hanya bendahara bisa tambah"  on public.kegiatan_bayar;
drop policy if exists "kegiatan_bayar: hanya bendahara bisa update"  on public.kegiatan_bayar;
drop policy if exists "kegiatan_bayar: hanya bendahara bisa hapus"   on public.kegiatan_bayar;

create policy "kegiatan_bayar: semua user login bisa baca"
  on public.kegiatan_bayar for select
  to authenticated
  using (true);

create policy "kegiatan_bayar: hanya bendahara bisa tambah"
  on public.kegiatan_bayar for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'bendahara')
  );

create policy "kegiatan_bayar: hanya bendahara bisa update"
  on public.kegiatan_bayar for update
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'bendahara')
  );

create policy "kegiatan_bayar: hanya bendahara bisa hapus"
  on public.kegiatan_bayar for delete
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'bendahara')
  );
