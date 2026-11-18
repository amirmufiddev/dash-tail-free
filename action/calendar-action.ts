"use server";
import {
  createEvent,
  deleteEvent,
  updateEvent,
} from "@/config/calendar.config";
import { revalidatePath } from "next/cache";

export const AddEvent = async (data: unknown) => {
  const response = await createEvent(data);
  revalidatePath("/calendar");
  return response;
};

export const deleteEventAction = async (id: string | number) => {
  const response = await deleteEvent(id);
  revalidatePath("/calendar");
  return response;
};

// update event
export const updateEventAction = async (id: string | number, data: unknown) => {
  const response = await updateEvent(String(id), data);
  revalidatePath("/calendar");
  return response;
};
