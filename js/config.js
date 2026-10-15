/**
 * config.js — Konfigurasi Supabase (PUBLIC)
 * ─────────────────────────────────────────────────────────────
 * File ini BOLEH masuk ke GitHub karena hanya berisi:
 *   - SUPABASE_URL      : URL project (bukan secret)
 *   - SUPABASE_ANON_KEY : Kunci publik (dilindungi RLS Supabase)
 *
 * SERVICE ROLE KEY tidak ada di sini — ada di Vercel Environment
 * Variables saja (tidak pernah menyentuh frontend).
 *
 * ─────────────────────────────────────────────────────────────
 * CARA MENGISI:
 *   1. Buka https://supabase.com → Project Anda
 *   2. Project Settings → API
 *   3. Salin "Project URL"  → tempel di SUPABASE_URL di bawah
 *   4. Salin "anon / public" → tempel di SUPABASE_ANON_KEY di bawah
 * ─────────────────────────────────────────────────────────────
 */

const SUPABASE_URL      = 'GANTI_DENGAN_PROJECT_URL_ANDA';
const SUPABASE_ANON_KEY = 'GANTI_DENGAN_ANON_KEY_ANDA';
