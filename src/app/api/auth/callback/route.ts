import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/auth';
import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      console.error('No code provided in callback');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?error=no_code`);
    }

    console.log('Processing OAuth callback');

    // 1. Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Token Error:', tokenData);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?error=token_error`);
    }

    const accessToken = tokenData.access_token;

    // 2. Get User Info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!userResponse.ok) {
      console.error('User Fetch Error:', await userResponse.text());
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?error=user_fetch_failed`);
    }

    const githubUser = await userResponse.json();
    console.log(`Authenticated user: ${githubUser.login}`);

    // 3. Get Emails
    let primaryEmail = githubUser.email;

    if (!primaryEmail) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (emailResponse.ok) {
        const emails = await emailResponse.json();
        if (Array.isArray(emails)) {
          primaryEmail = emails.find((e: any) => e.primary)?.email || emails[0]?.email;
        }
      }
    }

    if (!primaryEmail) {
      primaryEmail = `${githubUser.id}+${githubUser.login}@users.noreply.github.com`;
    }

    // 4. Create or get user from database
    let [user] = await query<any[]>(
      'SELECT id FROM users WHERE email = ?',
      [primaryEmail]
    );

    if (!user) {
      const userId = uuidv4();
      await query(
        `INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, NOW())`,
        [userId, primaryEmail, githubUser.name || githubUser.login]
      );
      user = { id: userId };
      console.log(`Created new user: ${primaryEmail}`);
    } else {
      console.log(`Existing user: ${primaryEmail}`);
    }

    // 5. Create Session
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    session.user = {
      id: user.id,
      githubId: githubUser.id,
      login: githubUser.login,
      email: primaryEmail,
      name: githubUser.name || githubUser.login,
      avatarUrl: githubUser.avatar_url,
    };
    session.isLoggedIn = true;
    await session.save();

    console.log('Session created successfully');

    // 6. Link installations (synchronously)
    try {
      await query(
        `UPDATE github_installations 
         SET user_id = ? 
         WHERE account_login = ? AND user_id IS NULL`,
        [user.id, githubUser.login]
      );

      await query(
        `UPDATE github_installations 
         SET user_id = ? 
         WHERE JSON_EXTRACT(metadata, '$.installation.account.id') = ? 
         AND user_id IS NULL`,
        [user.id, githubUser.id]
      );

      console.log('Linked installations to user');
    } catch (linkError) {
      console.error('Error linking installations:', linkError);
      // Don't fail the auth flow
    }

    console.log('Auth successful, redirecting to dashboard');
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`);
    
  } catch (error: any) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?error=auth_failed`);
  }
}