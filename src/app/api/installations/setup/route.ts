import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const installations = await query<any[]>(
      `SELECT 
        id,
        installation_id,
        account_login,
        account_type,
        installed_at,
        suspended_at,
        created_at
       FROM github_installations
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [user.id]
    );

    return NextResponse.json({ installations });
  } catch (error: any) {
    console.error('Get installations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch installations', details: error.message },
      { status: 500 }
    );
  }
}