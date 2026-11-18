"use client";

import { api } from "@/config/axios.config";

export type TodoItem = {
  id: number;
  userId: number;
  title: string;
  completed: boolean;
};

export type TodoDraft = {
  title: string;
};

export const getTodos = async (page: string | number): Promise<TodoItem[]> => {
  const response = await api.get<TodoItem[]>("/todos?page=" + page);
  return response.data;
};

export const getTodo = async (id: string | number): Promise<TodoItem> => {
  const response = await api.get<TodoItem>(`/todos/${id}`);
  return response.data;
};
export const createTodo = async (todo: TodoDraft): Promise<TodoItem> => {
  const response = await api.post<TodoItem>("/todos", todo);
  return response.data;
};

export const updateTodo = async ({
  id,
  todo,
}: {
  id: string | number;
  todo: TodoDraft;
}): Promise<TodoItem> => {
  const response = await api.put<TodoItem>(`/todos/${id}`, todo);
  return response.data;
};

export const deleteTodo = async (id: string | number) => {
  await api.delete(`/todos/${id}`);
};

const TodoAppLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default TodoAppLayout;
