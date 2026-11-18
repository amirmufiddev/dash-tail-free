import { api } from "@/config/axios.config";
import type {
  ChatProfile,
  ContactsResponse,
  MessagesResponse,
  OutboundChatMessage,
} from "./types";

export const getContacts = async (): Promise<ContactsResponse> => {
  const response = await api.get<ContactsResponse>("/chat");
  return response.data;
};

export const getMessages = async (id: string | number): Promise<MessagesResponse> => {
  try {
    const response = await api.get<MessagesResponse>(`/chat/messages/${id}`);
    console.log("Response from getMessages:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
};
export const deleteMessage = async (obj: {
  selectedChatId: string;
  index?: number;
}) => {
  console.log("Object to be sent:", obj); // Add this log statement
  try {
    await api.delete(`/chat/messages/${obj.selectedChatId}`, { data: obj });
  } catch (error) {
    console.error("Error deleting message:", error);
    // Handle error gracefully (e.g., display an error message to the user)
  }
};

export const getProfile = async (): Promise<ChatProfile> => {
  const response = await api.get<ChatProfile>("/chat/profile-data");

  return response.data;
};

export const sendMessage = async (msg: OutboundChatMessage) => {
  const response = await api.post("/chat/messages", msg);
  return response.data;
};
