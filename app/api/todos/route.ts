import { NextRequest, NextResponse } from "next/server";

import { demoData } from "./data";

// Helper function to delay responses
function delayResponse(responseObj: unknown, delay = 2000) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(responseObj);
    }, delay);
  });
}

export async function GET(request: NextRequest, response: unknown) {
  //const delayedResponse = await delayResponse(demoData, 2000);
  return NextResponse.json(demoData, { status: 200 });
}

export async function POST(request: NextRequest, response: unknown) {
  const newItem = await request.json();

  // Assign a new ID to the item (assuming there's no unique ID generation yet)
  newItem.id = demoData.length + 11414;

  // Add the new item to the array
  demoData.push(newItem);
  const delayedResponse = await delayResponse(newItem, 2000);
  return NextResponse.json(delayedResponse, { status: 201 });
}
