import { NextRequest, NextResponse } from "next/server";
import { comments } from "./data";

export async function GET(request: NextRequest, response: unknown) {
  //const delayedResponse = await delayResponse(demoData, 2000);
  return NextResponse.json(comments, { status: 200 });
}

export async function POST(request: NextRequest, response: unknown) {
  const newItem = await request.json();
  newItem.id = comments.length + 1;
  comments.push(newItem);

  return NextResponse.json(newItem, { status: 201 });
}
