/**
 * TEMPORARY DIAGNOSTIC ROUTE — DELETE IMMEDIATELY AFTER USE
 *
 * Visit this route once in the deployed app. It returns the `current_user` that
 * Prisma uses to connect to Postgres. You need that value to write the correct
 * RLS policies for the auth tables.
 *
 * Steps:
 *   1. Deploy this file.
 *   2. GET /api/debug-db-role (any authenticated request is fine; no auth guard
 *      is needed because we only expose harmless role metadata).
 *   3. Note the `current_user` value in the JSON response.
 *   4. Delete this file and redeploy.
 */
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        current_user: string
        rolsuper: boolean
        rolbypassrls: boolean
        session_user: string
      }>
    >`
      SELECT
        current_user,
        session_user,
        r.rolsuper,
        r.rolbypassrls
      FROM pg_roles r
      WHERE r.rolname = current_user
    `

    const role = rows[0] ?? null
    return NextResponse.json({
      ok: true,
      role,
      note: 'DELETE THIS ROUTE FILE IMMEDIATELY AFTER READING THE RESULT',
    })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 500 }
    )
  }
}
