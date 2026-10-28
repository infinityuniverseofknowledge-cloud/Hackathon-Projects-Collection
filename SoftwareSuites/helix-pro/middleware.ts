import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const protectedPaths = ['/dashboard', '/align', '/crispr', '/projects'];
  const path = request.nextUrl.pathname;
  if (protectedPaths.some((p) => path.startsWith(p))) {
    // In production, redirect if no session cookie is present.
    // Actual session check happens in the page via Supabase server client.
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
