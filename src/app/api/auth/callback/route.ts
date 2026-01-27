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
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?error=no_code`);
    }

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

    // 3. Get Emails (Safe Version)
    let primaryEmail = githubUser.email; // Try public email first

    // Only try to fetch private emails if we don't have one yet
    if (!primaryEmail) {
        const emailResponse = await fetch('https://api.github.com/user/emails', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (emailResponse.ok) {
            const emails = await emailResponse.json();
            // Check if it's actually an array before trying to .find()
            if (Array.isArray(emails)) {
                primaryEmail = emails.find((e: any) => e.primary)?.email || emails[0]?.email;
            }
        }
    }

    // Fallback if absolutely no email found (rare, but prevents crash)
    if (!primaryEmail) {
        primaryEmail = `${githubUser.id}+${githubUser.login}@users.noreply.github.com`;
    }

    // 4. Database Logic
    let [user] = await query<any[]>(
      'SELECT id FROM users WHERE email = ?',
      [primaryEmail]
    );

    if (!user) {
      const userId = uuidv4();
      await query(
        `INSERT INTO users (id, email, name) VALUES (?, ?, ?)`,
        [userId, primaryEmail, githubUser.name || githubUser.login]
      );
      user = { id: userId };
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

    // 6. Link installations - IMPROVED VERSION
    // Link by account login (username)
    await query(
      `UPDATE github_installations 
       SET user_id = ? 
       WHERE account_login = ?`,
      [user.id, githubUser.login]
    );

    // Also try to link by GitHub account ID from metadata
    await query(
      `UPDATE github_installations 
       SET user_id = ? 
       WHERE JSON_EXTRACT(metadata, '$.installation.account.id') = ? 
       AND user_id IS NULL`,
      [user.id, githubUser.id]
    );

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`);
    
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?error=auth_failed`);
  }
}