export type MailRecord = {
  id: string | number;
  name: string;
  subject?: string;
  label: string;
  text: string;
  starred?: boolean;
  date: string | number | Date;
  category: string;
};

export type MailDetail = {
  data?: {
    subject?: string;
  };
};

export type MailContact = {
  avatar?: string | { src?: string };
  id: string | number;
  fullName: string;
  status?: string;
  about?: string;
  chat?: { lastMessage?: string | null };
  unreadmessage?: number;
  date?: string;
};

export function mailAvatarSrc(avatar: MailContact["avatar"]): string | undefined {
  if (!avatar) return undefined;
  if (typeof avatar === "string") return avatar;
  return avatar.src;
}
