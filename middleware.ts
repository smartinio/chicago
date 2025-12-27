import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  if (
    process.env.NODE_ENV === 'production' &&
    req.headers.get('x-forwarded-proto') !== 'https' &&
    !req.headers.get('host')?.includes('localhost')
  ) {
    return NextResponse.redirect(`https://${req.headers.get('host')}${req.nextUrl.pathname}`, 301)
  }
}

export const config = {
  matcher: '/((?!ws$).*)', // match all except exactly /ws
}
