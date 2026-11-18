import { NextRequest, NextResponse } from "next/server";
import { mails } from "./data";

type Mail = (typeof mails)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readMail(value: unknown, id: number): Mail {
  const body = isRecord(value) ? value : {};
  return {
    id,
    name: typeof body.name === "string" ? body.name : "",
    subject: typeof body.subject === "string" ? body.subject : "",
    text: typeof body.text === "string" ? body.text : "",
    starred: body.starred === true,
    isRead: body.isRead === true,
    date: typeof body.date === "string" ? body.date : new Date().toISOString(),
    category: typeof body.category === "string" ? body.category : "primary",
    label: typeof body.label === "string" ? body.label : "work",
  };
}

export async function GET(_request: NextRequest) {
  try {
    return NextResponse.json({
      status: "success",
      message: "successfully",
      data: mails,
    });
  } catch (error) {
    return NextResponse.json({
      status: "fail",
      message: "Something went wrong",
      data: error,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const reqBody: unknown = await request.json();
    const mail = readMail(reqBody, mails.length + 1);
    mails.unshift(mail);

    return NextResponse.json({
      status: "success",
      message: "Email Send successfully",
      data: mail,
    });
  } catch (error) {
    return NextResponse.json({
      status: "fail",
      message: "Something went wrong",
      data: error,
    });
  }
}
