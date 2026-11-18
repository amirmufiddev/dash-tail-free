import { api, readAxiosErrorData } from "@/config/axios.config";

export const registerUser = async (data: unknown) => {
  try {
    const response = await api.post("/user/register", data);

    return response.data;
  } catch (error) {
    return readAxiosErrorData(error);
  }
};
