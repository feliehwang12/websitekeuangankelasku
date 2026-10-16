-- ══════════════════════════════════════════════════════════════
--  schema.sql — Keuangan Kelasku (versi multi-kelas)
--  Cara pakai: Supabase → SQL Editor → New Query → Paste → Run
--  Aman dijalankan berulang kali (idempotent)
--
--  Data dipisah per KELAS: LPS, Akuntansi Satu, Akuntansi Dua, Askep
--  Semua user dalam kelas yang sama berbagi database yang sama.
-- ══════════════════════════════════════════════════════════════

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
  kelas       text        not null default 'LPS'
                check (kelas in ('LPS','Akuntansi Satu','Akuntansi Dua','Askep')),
  aktif       boolean     not null default true,
  nis         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.profiles add column if not exists kelas text;
update public.profiles set kelas = 'LPS' where kelas is null;
alter table public.profiles alter column kelas set default 'LPS';
alter table public.profiles alter column kelas set not null;

-- ══════════════════════════════════════════════════════════════
--  KODE RAHASIA BENDAHARA — ⚠️ GANTI dengan kode Anda sendiri
-- ══════════════════════════════════════════════════════════════
create or replace function public.get_bendahara_code()
returns text
language sql
immutable
as $$
  select 'b3nd4h4r4'::text;
$$;

-- Helper: ambil kelas user yang sedang login
create or replace function public.current_kelas()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select kelas from public.profiles where id = auth.uid();
$$;

-- Helper: apakah user yang login bendahara?
create or replace function public.is_bendahara()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'bendahara'
  );
$$;

-- ══════════════════════════════════════════════════════════════
--  RPC: claim_bendahara(kode)
--  Dipanggil frontend SETELAH login. Jika kode cocok, role user
--  diubah jadi 'bendahara'. Andal, tidak bergantung timing trigger.
-- ══════════════════════════════════════════════════════════════
create or replace function public.claim_bendahara(kode text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text;
  v_nama  text;
  v_kelas text;
begin
  if v_uid is null then
    return 'not_logged_in';
  end if;

  if kode is null or kode <> public.get_bendahara_code() then
    return 'wrong_code';
  end if;

  select u.email,
         coalesce(u.raw_user_meta_data->>'nama', split_part(u.email,'@',1)),
         coalesce(u.raw_user_meta_data->>'kelas', 'LPS')
    into v_email, v_nama, v_kelas
  from auth.users u where u.id = v_uid;

  if v_kelas not in ('LPS','Akuntansi Satu','Akuntansi Dua','Askep') then
    v_kelas := 'LPS';
  end if;

  insert into public.profiles (id, nama, email, role, kelas)
  values (v_uid, v_nama, v_email, 'bendahara', v_kelas)
  on conflict (id) do update set role = 'bendahara';

  return 'ok';
end;
$$;

grant execute on function public.claim_bendahara(text) to authenticated;

-- ══════════════════════════════════════════════════════════════
--  Trigger: auto-buat profil saat user baru sign up
-- ══════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role      text;
  v_role_req  text;
  v_kode_req  text;
  v_kelas     text;
begin
  v_role_req := coalesce(new.raw_user_meta_data->>'role', 'siswa');
  v_kode_req := coalesce(new.raw_user_meta_data->>'kode_bendahara', '');
  v_kelas    := coalesce(new.raw_user_meta_data->>'kelas', 'LPS');

  if v_kelas not in ('LPS','Akuntansi Satu','Akuntansi Dua','Askep') then
    v_kelas := 'LPS';
  end if;

  v_role := 'siswa';
  if v_role_req = 'bendahara' and v_kode_req = public.get_bendahara_code() then
    v_role := 'bendahara';
  end if;

  insert into public.profiles (id, nama, email, role, kelas)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nama', split_part(new.email,'@',1)),
    new.email,
    v_role,
    v_kelas
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
--  TABEL: transaksi (per kelas)
-- ══════════════════════════════════════════════════════════════
create table if not exists public.transaksi (
  id          uuid primary key default uuid_generate_v4(),
  kelas       text        not null default 'LPS',
  tgl         date        not null,
  jenis       text        not null check (jenis in ('masuk','keluar')),
  kategori    text        not null,
  keterangan  text        not null,
  nominal     bigint      not null check (nominal > 0),
  created_by  uuid        references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.transaksi add column if not exists kelas text;
update public.transaksi set kelas = 'LPS' where kelas is null;
alter table public.transaksi alter column kelas set default 'LPS';
alter table public.transaksi alter column kelas set not null;

drop trigger if exists transaksi_updated_at on public.transaksi;
create trigger transaksi_updated_at
  before update on public.transaksi
  for each row execute procedure public.set_updated_at();

-- ══════════════════════════════════════════════════════════════
--  TABEL: iuran (per kelas)
-- ══════════════════════════════════════════════════════════════
create table if not exists public.iuran (
  id          uuid primary key default uuid_generate_v4(),
  kelas       text        not null default 'LPS',
  siswa_id    uuid        not null references public.profiles(id) on delete cascade,
  bulan       text        not null,
  nominal     bigint      not null default 10000,
  status      text        not null default 'belum' check (status in ('lunas','belum')),
  tgl_bayar   date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (siswa_id, bulan)
);
alter table public.iuran add column if not exists kelas text;
update public.iuran set kelas = 'LPS' where kelas is null;
alter table public.iuran alter column kelas set default 'LPS';
alter table public.iuran alter column kelas set not null;

drop trigger if exists iuran_updated_at on public.iuran;
create trigger iuran_updated_at
  before update on public.iuran
  for each row execute procedure public.set_updated_at();

-- ══════════════════════════════════════════════════════════════
--  TABEL: kegiatan (per kelas)
-- ══════════════════════════════════════════════════════════════
create table if not exists public.kegiatan (
  id          uuid primary key default uuid_generate_v4(),
  kelas       text        not null default 'LPS',
  nama        text        not null,
  nominal     bigint      not null check (nominal > 0),
  tgl         date        not null,
  deskripsi   text,
  created_by  uuid        references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.kegiatan add column if not exists kelas text;
update public.kegiatan set kelas = 'LPS' where kelas is null;
alter table public.kegiatan alter column kelas set default 'LPS';
alter table public.kegiatan alter column kelas set not null;

drop trigger if exists kegiatan_updated_at on public.kegiatan;
create trigger kegiatan_updated_at
  before update on public.kegiatan
  for each row execute procedure public.set_updated_at();

-- ══════════════════════════════════════════════════════════════
--  TABEL: kegiatan_bayar (per kelas)
-- ══════════════════════════════════════════════════════════════
create table if not exists public.kegiatan_bayar (
  id           uuid primary key default uuid_generate_v4(),
  kelas        text        not null default 'LPS',
  kegiatan_id  uuid        not null references public.kegiatan(id) on delete cascade,
  siswa_id     uuid        not null references public.profiles(id) on delete cascade,
  status       text        not null default 'belum' check (status in ('lunas','belum')),
  tgl_bayar    date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (kegiatan_id, siswa_id)
);
alter table public.kegiatan_bayar add column if not exists kelas text;
update public.kegiatan_bayar set kelas = 'LPS' where kelas is null;
alter table public.kegiatan_bayar alter column kelas set default 'LPS';
alter table public.kegiatan_bayar alter column kelas set not null;

drop trigger if exists kegiatan_bayar_updated_at on public.kegiatan_bayar;
create trigger kegiatan_bayar_updated_at
  before update on public.kegiatan_bayar
  for each row execute procedure public.set_updated_at();

-- ══════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY (RLS) — berbasis kelas
-- ══════════════════════════════════════════════════════════════

-- ── profiles ─────────────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "profiles: semua user login bisa baca"       on public.profiles;
drop policy if exists "profiles: baca sekelas"                      on public.profiles;
drop policy if exists "profiles: user update milik sendiri"        on public.profiles;
drop policy if exists "profiles: user insert milik sendiri"        on public.profiles;
drop policy if exists "profiles: update nama sendiri (tanpa role)" on public.profiles;
drop policy if exists "profiles: update sekelas oleh bendahara"    on public.profiles;

create policy "profiles: baca sekelas"
  on public.profiles for select to authenticated
  using (kelas = public.current_kelas());

create policy "profiles: update nama sendiri (tanpa role)"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role  = (select role  from public.profiles where id = auth.uid())
    and kelas = (select kelas from public.profiles where id = auth.uid())
  );

create policy "profiles: update sekelas oleh bendahara"
  on public.profiles for update to authenticated
  using (public.is_bendahara() and kelas = public.current_kelas())
  with check (public.is_bendahara() and kelas = public.current_kelas());

-- ── transaksi ─────────────────────────────────────────────────
alter table public.transaksi enable row level security;
drop policy if exists "transaksi: baca sekelas"             on public.transaksi;
drop policy if exists "transaksi: bendahara tambah sekelas" on public.transaksi;
drop policy if exists "transaksi: bendahara update sekelas" on public.transaksi;
drop policy if exists "transaksi: bendahara hapus sekelas"  on public.transaksi;

create policy "transaksi: baca sekelas"
  on public.transaksi for select to authenticated
  using (kelas = public.current_kelas());
create policy "transaksi: bendahara tambah sekelas"
  on public.transaksi for insert to authenticated
  with check (public.is_bendahara() and kelas = public.current_kelas());
create policy "transaksi: bendahara update sekelas"
  on public.transaksi for update to authenticated
  using (public.is_bendahara() and kelas = public.current_kelas())
  with check (public.is_bendahara() and kelas = public.current_kelas());
create policy "transaksi: bendahara hapus sekelas"
  on public.transaksi for delete to authenticated
  using (public.is_bendahara() and kelas = public.current_kelas());

-- ── iuran ─────────────────────────────────────────────────────
alter table public.iuran enable row level security;
drop policy if exists "iuran: baca sekelas"             on public.iuran;
drop policy if exists "iuran: bendahara tambah sekelas" on public.iuran;
drop policy if exists "iuran: bendahara update sekelas" on public.iuran;
drop policy if exists "iuran: bendahara hapus sekelas"  on public.iuran;

create policy "iuran: baca sekelas"
  on public.iuran for select to authenticated
  using (kelas = public.current_kelas());
create policy "iuran: bendahara tambah sekelas"
  on public.iuran for insert to authenticated
  with check (public.is_bendahara() and kelas = public.current_kelas());
create policy "iuran: bendahara update sekelas"
  on public.iuran for update to authenticated
  using (public.is_bendahara() and kelas = public.current_kelas())
  with check (public.is_bendahara() and kelas = public.current_kelas());
create policy "iuran: bendahara hapus sekelas"
  on public.iuran for delete to authenticated
  using (public.is_bendahara() and kelas = public.current_kelas());

-- ── kegiatan ─────────────────────────────────────────────────
alter table public.kegiatan enable row level security;
drop policy if exists "kegiatan: baca sekelas"             on public.kegiatan;
drop policy if exists "kegiatan: bendahara tambah sekelas" on public.kegiatan;
drop policy if exists "kegiatan: bendahara update sekelas" on public.kegiatan;
drop policy if exists "kegiatan: bendahara hapus sekelas"  on public.kegiatan;

create policy "kegiatan: baca sekelas"
  on public.kegiatan for select to authenticated
  using (kelas = public.current_kelas());
create policy "kegiatan: bendahara tambah sekelas"
  on public.kegiatan for insert to authenticated
  with check (public.is_bendahara() and kelas = public.current_kelas());
create policy "kegiatan: bendahara update sekelas"
  on public.kegiatan for update to authenticated
  using (public.is_bendahara() and kelas = public.current_kelas())
  with check (public.is_bendahara() and kelas = public.current_kelas());
create policy "kegiatan: bendahara hapus sekelas"
  on public.kegiatan for delete to authenticated
  using (public.is_bendahara() and kelas = public.current_kelas());

-- ── kegiatan_bayar ────────────────────────────────────────────
alter table public.kegiatan_bayar enable row level security;
drop policy if exists "kegiatan_bayar: baca sekelas"             on public.kegiatan_bayar;
drop policy if exists "kegiatan_bayar: bendahara tambah sekelas" on public.kegiatan_bayar;
drop policy if exists "kegiatan_bayar: bendahara update sekelas" on public.kegiatan_bayar;
drop policy if exists "kegiatan_bayar: bendahara hapus sekelas"  on public.kegiatan_bayar;

create policy "kegiatan_bayar: baca sekelas"
  on public.kegiatan_bayar for select to authenticated
  using (kelas = public.current_kelas());
create policy "kegiatan_bayar: bendahara tambah sekelas"
  on public.kegiatan_bayar for insert to authenticated
  with check (public.is_bendahara() and kelas = public.current_kelas());
create policy "kegiatan_bayar: bendahara update sekelas"
  on public.kegiatan_bayar for update to authenticated
  using (public.is_bendahara() and kelas = public.current_kelas())
  with check (public.is_bendahara() and kelas = public.current_kelas());
create policy "kegiatan_bayar: bendahara hapus sekelas"
  on public.kegiatan_bayar for delete to authenticated
  using (public.is_bendahara() and kelas = public.current_kelas());
