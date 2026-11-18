import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_SITE_URL + "/api"; // Change this if using a diffe // Change this if using a different backend API

export const api = axios.create({
  baseURL,
});

export function readAxiosErrorData(error: unknown): unknown {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    throw error;
  }
  const response = error.response;
  if (typeof response !== "object" || response === null || !("data" in response)) {
    throw error;
  }
  return response.data;
}
