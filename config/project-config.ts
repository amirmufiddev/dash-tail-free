import { api } from "@/config/axios.config";

export const getProjects = async () => {
  const response = await api.get("/projects");
  return response.data;
};

export const createProject = async (project: unknown) => {
  const response = await api.post("/projects", project);
  return response.data;
};

export const deleteProject = async (id: string | number) => {
  await api.delete(`/projects/${id}`);
};

export const getProject = async (id: string | number) => {
  const response = await api.get(`/projects/${id}`);
  return response.data;
};

export const updateProject = async (id: string, project: unknown) => {
  const response = await api.put(`/projects/${id}`, project);
  return response.data;
};

// board
export const getBoards = async () => {
  const response = await api.get("/boards");
  return response.data;
};
export const createBoard = async (board: unknown) => {
  const response = await api.post("/boards", board);
  return response.data;
};

export const deleteBoard = async (id: string | number) => {
  await api.delete(`/boards/${id}`);
};
export const updateBoard = async (id: string, board: unknown) => {
  const response = await api.put(`/boards/${id}`, board);
  return response.data;
};
export const swapBoard = async (data: unknown) => {
  const response = await api.patch("/boards", data);
  return response.data;
};
// tasks
export const getTasks = async () => {
  const response = await api.get("/tasks");
  return response.data;
};

export const createTask = async (board: unknown) => {
  const response = await api.post("/tasks", board);
  return response.data;
};
export const deleteTask = async (id: string | number) => {
  await api.delete(`/tasks/${id}`);
};

export const updateTask = async (taskId: string | number, updatedFields: unknown) => {
  try {
    const response = await api.put(`/tasks/${taskId}`, updatedFields);
    return response.data;
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
};

// sub task
export const getSubtasks = async () => {
  const response = await api.get(`/tasks/subtasks`);
  return response.data;
};
export const createSubTask = async (subtask: unknown) => {
  const response = await api.post("/tasks/subtasks", subtask);
  return response.data;
};
export const deleteSubTask = async (id: string | number) => {
  await api.delete(`/tasks/subtasks/${id}`);
};

export const updateSubTask = async (subtaskId: string | number, updatedFields: unknown) => {
  try {
    const response = await api.put(
      `/tasks/subtasks/${subtaskId}`,
      updatedFields
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// comments
export const getComments = async () => {
  const response = await api.get(`/comments`);
  return response.data;
};

export const postComment = async (comment: unknown) => {
  const response = await api.post("/comments", comment);
  return response.data;
};
