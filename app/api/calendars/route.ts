import { NextRequest, NextResponse } from "next/server";
import { calendarEvents } from "./data";

type CalendarEvent = (typeof calendarEvents)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readDate(value: unknown, fallback: Date): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function readCalendarEvent(value: unknown, id: number): CalendarEvent {
  const body = isRecord(value) ? value : {};
  const extended = isRecord(body.extendedProps) ? body.extendedProps : {};
  const now = new Date();
  return {
    id,
    title: typeof body.title === "string" ? body.title : "Untitled",
    start: readDate(body.start, now),
    end: readDate(body.end, now),
    allDay: body.allDay === true,
    extendedProps: {
      calendar:
        typeof extended.calendar === "string" ? extended.calendar : "business",
    },
  };
}

export async function GET(_request: NextRequest) {
  try {
    return NextResponse.json({
      status: "success",
      message: "Event created successfully",
      data: calendarEvents,
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
    const event = readCalendarEvent(reqBody, calendarEvents.length + 1);
    calendarEvents.push(event);

    return NextResponse.json({
      status: "success",
      message: "User created successfully",
      data: event,
    });
  } catch (error) {
    return NextResponse.json({
      status: "fail",
      message: "Something went wrong",
      data: error,
    });
  }
}
