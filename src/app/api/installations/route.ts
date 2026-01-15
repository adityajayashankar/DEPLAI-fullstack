import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const installations = await query<any[]>(
      `SELECT 
        id,
        installation_id,
        account_login,
        account_type,
        installed_at,
        created_at
       FROM github_installations
       ORDER BY created_at DESC`
    );

    return NextResponse.json({ installations });
  } catch (error) {
    console.error('Error fetching installations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch installations' },
      { status: 500 }
    );
  }
}