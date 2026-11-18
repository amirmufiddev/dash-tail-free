"use client";

import { api } from "@/config/axios.config";

export const getTodos = async (page: string) => {
  const response = await api.get("/todos?page=" + page);
  return response.data;
};

export const getTodo = async (id: string) => {
  const response = await api.get(`/todos/${id}`);
  return response.data;
};
export const createTodo = async (todo: unknown) => {
  const response = await api.post("/todos", todo);
  return response.data;
};

export const updateTodo = async ({ id, todo }: { id: string; todo: unknown }) => {
  console.log(id, "ami updated id");
  console.log(todo, "ami updated todo");
  const response = await api.put(`/todos/${id}`, todo);
  return response.data;
};

export const deleteTodo = async (id: string) => {
  await api.delete(`/todos/${id}`);
};

const TodoAppLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default TodoAppLayout;
