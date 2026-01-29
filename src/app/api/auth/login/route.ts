import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;

    if (!clientId) {
      console.error('GITHUB_CLIENT_ID not configured');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?error=config_error`);
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'user:email read:user',
    });

    const githubAuthUrl = `https://github.com/login/oauth/authorize?${params}`;
    
    return NextResponse.redirect(githubAuthUrl);
  } catch (error) {
    console.error('Login route error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?error=login_failed`);
  }
}