import { NextRequest, NextResponse } from "next/server";
import { demoBoards } from "../data";

export async function PUT(request: NextRequest, response: unknown) {
  const payloadItem = await request.json();

  const index = demoBoards.findIndex(
    (item) => item.id === parseInt(payloadItem.id)
  );

  if (index !== -1) {
    // Update the item in the array
    demoBoards[index] = payloadItem;

    return NextResponse.json(
      { message: "Item updated successfully" },
      { status: 200 }
    );
  } else {
    return NextResponse.json({ message: "Item not found" }, { status: 404 });
  }
}

export async function DELETE(request: NextRequest, response: { params: Promise<{ id: string }> }) {
  const id = (await response.params).id;

  const index = demoBoards.findIndex((item) => item.id === parseInt(id));

  if (index !== -1) {
    // Remove the item from the array
    demoBoards.splice(index, 1);
    return NextResponse.json(
      { message: "Item deleted successfully" },
      { status: 200 }
    );
  } else {
    return NextResponse.json({ message: "Item not found" }, { status: 404 });
  }
}
