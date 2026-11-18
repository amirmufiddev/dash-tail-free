import type { StaticImageData } from "next/image";
import type { ReactNode } from "react";

export type ChatAvatar = StaticImageData | string;

export function chatAvatarSrc(
  avatar: ChatAvatar | { src?: string } | null | undefined
): string {
  if (!avatar) return "";
  if (typeof avatar === "string") return avatar;
  return avatar.src ?? "";
}

export type ChatContact = {
  id: number;
  fullName: string;
  role?: string;
  about?: string;
  avatar: ChatAvatar;
  status?: string;
  unreadmessage?: number;
  date?: string;
};

export type ChatContactWithMeta = ChatContact & {
  chat?: {
    id: number | null;
    unseenMsgs?: number | null;
    lastMessage?: string | null;
    lastMessageTime?: string | null;
  };
};

export type ContactsResponse = {
  contacts: ChatContactWithMeta[];
};

export type ChatMessage = {
  message: string;
  time: string | Date;
  senderId: number;
  replayMetadata?: boolean;
  note?: ReactNode;
  avatar?: ChatAvatar;
};

export type ChatThread = {
  id: number;
  chat: ChatMessage[];
  userId?: number;
  unseenMsgs?: number;
};

export type MessagesResponse = {
  chat: ChatThread;
  contact: ChatContact;
};

export type ChatProfile = {
  id: number;
  avatar?: StaticImageData | string;
  fullName?: string;
  bio?: string;
  role?: string;
  about?: string;
  status?: string;
  date?: string;
};

export type PinnedMessageRef = {
  selectedChatId?: string;
  index?: number;
  avatar?: ChatAvatar;
  note?: ReactNode;
  isPinned?: boolean;
};

export type OutboundChatMessage = {
  selectedChatId: string | number;
  message: string;
  index?: number;
  contact?: { id: string | number };
  replayMetadata?: boolean;
};

export type ReplyDraft = {
  message?: string;
  contact?: Pick<ChatContact, "id" | "fullName" | "avatar">;
};