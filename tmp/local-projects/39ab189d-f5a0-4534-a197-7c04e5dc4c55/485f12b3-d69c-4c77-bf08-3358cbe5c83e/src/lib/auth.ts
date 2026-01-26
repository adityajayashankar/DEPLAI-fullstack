import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from './session';
import { query } from './db';

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.isLoggedIn || !session.user) {
    return null;
  }

  return session.user;
}

export async function verifyInstallationOwnership(
  userId: string,
  installationId: string
): Promise<boolean> {
  const [result] = await query<any[]>(
    `SELECT id FROM github_installations 
     WHERE id = ? AND user_id = ?`,
    [installationId, userId]
  );

  return !!result;
}

export async function verifyRepositoryOwnership(
  userId: string,
  owner: string,
  repo: string
): Promise<{ installationId: string } | null> {
  const [result] = await query<any[]>(
    `SELECT r.installation_id, i.id as installation_uuid
     FROM github_repositories r
     JOIN github_installations i ON i.id = r.installation_id
     WHERE r.full_name = ? AND i.user_id = ?`,
    [`${owner}/${repo}`, userId]
  );

  return result ? { installationId: result.installation_uuid } : null;
}