import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/auth';

// 1. Add this GET handler to allow fetching installations
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const installations = await query<any[]>(
      `SELECT 
        id,
        installation_id,
        account_login,
        account_type,
        installed_at,
        created_at
       FROM github_installations
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [session.user.id]
    );

    return NextResponse.json({ 
      success: true,
      installations 
    });
  } catch (error: any) {
    console.error('Fetch installations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch installations' },
      { status: 500 }
    );
  }
}

// 2. Keep your existing POST handler for linking/refreshing
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Link any unlinked installations for this user
    await query(
      `UPDATE github_installations 
       SET user_id = ? 
       WHERE account_login = ? AND user_id IS NULL`,
      [session.user.id, session.user.login]
    );

    // Get updated installations
    const installations = await query<any[]>(
      `SELECT 
        id,
        installation_id,
        account_login,
        account_type,
        installed_at,
        created_at
       FROM github_installations
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [session.user.id]
    );

    return NextResponse.json({ 
      success: true,
      installations 
    });
  } catch (error: any) {
    console.error('Setup installations error:', error);
    return NextResponse.json(
      { error: 'Failed to setup installations' },
      { status: 500 }
    );
  }
}