'use client';

import { createBrowserClient } from '@supabase/ssr';

// The anon key is safe to expose in the browser — access is controlled by
// Row Level Security policies on the Supabase project, not by key secrecy.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qjogykolbwnxundhjxqr.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqb2d5a29sYndueHVuZGhqeHFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTQ0ODAsImV4cCI6MjA5Njg3MDQ4MH0.OYr74ro3Dse8oT5WxrVi03kGeyRWU4wJDHN4JsGijtk';

// Cookie-based session storage so the logged-in admin's session is visible
// to middleware and server-side Route Handlers, not just the browser tab.
export const supabaseBrowser = createBrowserClient(supabaseUrl, supabaseAnonKey);

export const SCREENSHOT_BUCKET = 'match-screenshots';
export const TEAM_PICTURE_BUCKET = 'team-pictures';

export async function signIn(email, password) {
  const { data, error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabaseBrowser.auth.signOut();
}

export async function getCurrentUser() {
  const { data } = await supabaseBrowser.auth.getUser();
  return data?.user || null;
}

async function uploadToBucket(bucket, file) {
  if (!file) return null;

  const ext = file.name.split('.').pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabaseBrowser.storage
    .from(bucket)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  const { data } = supabaseBrowser.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadScreenshot(file) {
  return uploadToBucket(SCREENSHOT_BUCKET, file);
}

export async function uploadTeamPicture(file) {
  return uploadToBucket(TEAM_PICTURE_BUCKET, file);
}
