import { api, readAxiosErrorData } from "@/config/axios.config";

export const getEvents = async (selectedCategory = undefined) => {
  try {
    const response = await api.get(`/calendars`);
    return response.data;
  } catch (error) {
    return readAxiosErrorData(error);
  }
};
export const getCategories = async () => {
  try {
    const response = await api.get("/calendars/categories");
    return response.data;
  } catch (error) {
    return readAxiosErrorData(error);
  }
};
export const createEvent = async (data: unknown) => {
  try {
    const response = await api.post("/calendars", data);
    return response.data;
  } catch (error) {
    return readAxiosErrorData(error);
  }
};

// delete
export const deleteEvent = async (id: string | number) => {
  try {
    const response = await api.delete(`/calendars/${id}`);
    return response.data;
  } catch (error) {
    return readAxiosErrorData(error);
  }
};

// update
export const updateEvent = async (id: string, data: unknown) => {
  try {
    const response = await api.put(`/calendars/${id}`, data);
    return response.data;
  } catch (error) {
    return readAxiosErrorData(error);
  }
};
