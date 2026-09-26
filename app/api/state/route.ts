import { NextResponse } from "next/server";
import { getState, storageKind } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getState();
  return NextResponse.json(
    { state, storage: storageKind(), serverTime: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
