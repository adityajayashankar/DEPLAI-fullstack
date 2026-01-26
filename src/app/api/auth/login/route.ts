import { NextResponse } from 'next/server';

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    scope: 'user:email read:user',
  });

  const githubAuthUrl = `https://github.com/login/oauth/authorize?${params}`;
  
  return NextResponse.redirect(githubAuthUrl);
}