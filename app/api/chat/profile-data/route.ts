import { NextRequest, NextResponse } from "next/server";
import { profileUser } from "../data";

export async function GET(request: NextRequest, response: unknown) {
  return NextResponse.json(profileUser, { status: 200 });
}
