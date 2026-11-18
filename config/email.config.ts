import { api, readAxiosErrorData } from "@/config/axios.config";

export const getEmails = async () => {
  try {
    const response = await api.get(`/email`);
    return response.data;
  } catch (error) {
    return readAxiosErrorData(error);
  }
};
export const getMail = async (id: string | number) => {
  try {
    const response = await api.get(`/email/${id}`);
    return response.data;
  } catch (error) {
    return readAxiosErrorData(error);
  }
};

// create
export const createEmail = async (data: unknown) => {
  try {
    const response = await api.post("/email", data);
    return response.data;
  } catch (error) {
    return readAxiosErrorData(error);
  }
};
// delete
export const deleteEmail = async (id: string | number) => {
  try {
    const response = await api.delete(`/email/${id}`);
    return response.data;
  } catch (error) {
    return readAxiosErrorData(error);
  }
};
