'use client';

import { createClient } from '@supabase/supabase-js';

// The anon key is safe to expose in the browser — access is controlled by
// Row Level Security policies on the Supabase project, not by key secrecy.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qjogykolbwnxundhjxqr.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqb2d5a29sYndueHVuZGhqeHFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTQ0ODAsImV4cCI6MjA5Njg3MDQ4MH0.OYr74ro3Dse8oT5WxrVi03kGeyRWU4wJDHN4JsGijtk';

export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);

export const SCREENSHOT_BUCKET = 'match-screenshots';

export async function uploadScreenshot(file) {
  if (!file) return null;

  const ext = file.name.split('.').pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabaseBrowser.storage
    .from(SCREENSHOT_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  const { data } = supabaseBrowser.storage.from(SCREENSHOT_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
