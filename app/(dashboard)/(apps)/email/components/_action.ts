"use server";
import { readAxiosErrorData } from "@/config/axios.config";
import { createEmail, deleteEmail, getMail } from "@/config/email.config";
import { revalidatePath } from "next/cache";

export const getMailAction = async (id: string | number) => {
  try {
    const response = await getMail(id);
    revalidatePath("/email");
    return response;
  } catch (error) {
    return readAxiosErrorData(error);
  }
};

// create email action
export const createEmailAction = async (data: unknown) => {
  try {
    const response = await createEmail(data);
    revalidatePath("/email");
    return response;
  } catch (error) {
    return readAxiosErrorData(error);
  }
};

// delete
export const deleteMailAction = async (id: string | number) => {
  try {
    const response = await deleteEmail(id);
    revalidatePath("/email");
    return response;
  } catch (error) {
    return readAxiosErrorData(error);
  }
};
