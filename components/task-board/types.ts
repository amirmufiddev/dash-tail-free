import type { ReactNode } from "react";

export type TaskAssignee = {
  image: { src: string };
  name: ReactNode;
};

export type TaskListItem = {
  title: ReactNode;
};

export type TaskRecord = {
  id: string | number;
  boardId: string | number;
  title?: string;
  desc?: string;
  tag?: ReactNode;
  tags?: string[];
  priority?: string;
  status?: string;
  version?: string;
  assign?: TaskAssignee[];
  list?: TaskListItem[];
  image?: string;
  category?: ReactNode;
  pages?: unknown;
  messageCount?: ReactNode;
  link?: ReactNode;
  date?: ReactNode;
  time?: ReactNode;
  storyPoints?: ReactNode;
};

export type BoardRecord = {
  id: string | number;
  name?: ReactNode;
  status?: string;
};

export type SubTaskRecord = {
  id: string | number;
  taskId: string | number;
  title?: ReactNode;
  completed?: boolean;
  assignDate?: ReactNode;
  assign?: { image: string }[];
  priority?: ReactNode;
};

export type CommentRecord = {
  id?: string | number;
  subTaskId?: string | number;
  taskId?: string | number;
  avatar?: string;
  name?: ReactNode;
  date?: ReactNode;
  text?: ReactNode;
};