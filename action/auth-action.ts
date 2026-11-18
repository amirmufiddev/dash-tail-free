"use server";
import { registerUser } from "@/config/user.config";
import { revalidatePath } from "next/cache";

export const addUser = async (data: unknown) => {
  const response = await registerUser(data);
  return response;
};
