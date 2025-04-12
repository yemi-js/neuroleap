import { NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req) {
  const res = NextResponse.next()
  
  // Create a Supabase client configured to use cookies
  const supabase = createMiddlewareClient({ req, res })
  
  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/api/webhook/paystack',
    '/payment/verify',
    '/reset-password',
    '/dashboard',
    '/dashboard/*',
    '/chat',
    '/chat/*',
    '/chat/new',
    '/chat/new/*',
    '/chat/new/create',
    '/chat/new/create/*',
    '/concepts',

    '/billing',
    '/profile',
    '/profile/*',
    '/settings',
    '/settings/*',
    '/settings/profile',
    '/settings/profile/*',
    '/test-openai'
    
    
  ]
  
  // Check if the requested path is a public route
  const path = req.nextUrl.pathname
  const isPublicRoute = publicRoutes.some(route => 
    path === route || 
    path.startsWith('/api/auth') ||
    path.startsWith('/_next') ||
    path.includes('.') // Static files like .js, .css, .png
  )
  
  // Refresh session if it exists
  const { data: { session } } = await supabase.auth.getSession()
  
  // If no session and trying to access protected route, redirect to home page
  if (!session && !isPublicRoute) {
    const redirectUrl = new URL('/', req.url)
    redirectUrl.searchParams.set('redirectedFrom', path)
    return NextResponse.redirect(redirectUrl)
  }
  
  // If session exists and trying to access home page with redirectedFrom,
  // redirect to the original destination
  if (session && path === '/' && req.nextUrl.searchParams.has('redirectedFrom')) {
    const redirectedFrom = req.nextUrl.searchParams.get('redirectedFrom')
    return NextResponse.redirect(new URL(redirectedFrom, req.url))
  }
  
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
} 