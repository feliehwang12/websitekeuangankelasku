/**
 * public_config.js — Konfigurasi Supabase (PUBLIC / AMAN DI GITHUB)
 * ══════════════════════════════════════════════════════════════════
 *
 * File ini BOLEH masuk ke GitHub karena hanya berisi:
 *   • SUPABASE_URL      → URL project Anda (bukan secret)
 *   • SUPABASE_ANON_KEY → Kunci publik (keamanan dijaga oleh RLS Supabase)
 *
 * ❌ SERVICE ROLE KEY tidak boleh ada di file ini.
 *    Simpan service role key di Vercel Environment Variables saja.
 *
 * ══════════════════════════════════════════════════════════════════
 * CARA MENGISI (lakukan ini sekarang):
 *
 *   1. Buka https://supabase.com → login → masuk ke project Anda
 *   2. Klik ikon ⚙️  "Project Settings" di sidebar kiri bawah
 *   3. Klik tab "API"
 *   4. Salin nilai berikut lalu tempel di bawah:
 *      • "Project URL"   → tempel di SUPABASE_URL
 *      • "anon / public" → tempel di SUPABASE_ANON_KEY
 * ══════════════════════════════════════════════════════════════════
 */

const SUPABASE_URL      = 'https://sagpakiocuvfdwilphvz.supabase.co';
//  Contoh: 'https://abcdefghijklmnop.supabase.co'

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZ3Bha2lvY3V2ZmR3aWxwaHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNjk2NTMsImV4cCI6MjEwNzY0NTY1M30.2gkkiDet7BJ_yhjdb75ife-n0BtzuAfWmm5KOeION-A';
//  Contoh: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
