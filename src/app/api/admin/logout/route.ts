import { NextResponse } from "next/server";

/** Legacy endpoint — admin UI signs out via next-auth. */
export async function POST() {
  return NextResponse.json({ ok: true });
}
