import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.SUPABASE_URL || 'https://qjogykolbwnxundhjxqr.supabase.co';
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqb2d5a29sYndueHVuZGhqeHFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTQ0ODAsImV4cCI6MjA5Njg3MDQ4MH0.OYr74ro3Dse8oT5WxrVi03kGeyRWU4wJDHN4JsGijtk';

export async function middleware(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLoginPage = path === '/admin/login';
  const isAdminRoute = path.startsWith('/admin');

  if (isAdminRoute && !isLoginPage && !data?.user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }

  if (isLoginPage && data?.user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
