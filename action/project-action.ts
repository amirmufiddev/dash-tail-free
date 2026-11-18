"use server";
import {
  createProject,
  deleteProject,
  getProject,
  updateProject,
  createBoard,
  deleteBoard,
  updateBoard,
  createTask,
  updateTask,
  getSubtasks,
  createSubTask,
  updateSubTask,
  deleteTask,
  deleteSubTask,
  postComment,
  swapBoard,
} from "@/config/project-config";
import { revalidatePath } from "next/cache";

export async function addProjectAction(project: unknown) {
  await createProject(project);
  revalidatePath("/projects");
}

export const deleteProjectAction = async (id: string | number) => {
  await deleteProject(id);
  revalidatePath("/projects");
};

export const editProjectAction = async (id: string | number, project: unknown) => {
  await updateProject(String(id), project);
  revalidatePath("/projects");
};

export const viewProjectAction = async (id: string | number) => {
  await getProject(id);
  revalidatePath("/projects");
};

// boards
export async function addBoardAction(board: unknown) {
  await createBoard(board);

  revalidatePath("/projects");
}

export const editBoardAction = async (id: string | number, board: unknown) => {
  await updateBoard(String(id), board);
  revalidatePath("/");
};
export const swapBoardAction = async (data: unknown) => {
  await swapBoard(data);
  revalidatePath("/");
};
export const deleteBoardAction = async (id: string | number) => {
  await deleteBoard(id);
  revalidatePath("/projects/*");
};

// task
export async function addTaskAction(task: unknown) {
  await createTask(task);
  revalidatePath("/projects/*");
}

export const deleteTaskAction = async (id: string | number) => {
  await deleteTask(id);
  revalidatePath("/projects/*");
};
export const updateTaskAction = async (taskId: string | number, updatedFields: unknown) => {
  await updateTask(taskId, updatedFields);
  revalidatePath("/projects/*");
};

// sub task
export async function addSubTaskAction(subtask: unknown) {
  await createSubTask(subtask);
  revalidatePath("/projects/*");
}

export const deleteSubTaskAction = async (id: string | number) => {
  await deleteSubTask(id);
  revalidatePath("/projects/*");
};
export const updateSubTaskAction = async (subtaskId: string | number, updatedFields: unknown) => {
  await updateSubTask(subtaskId, updatedFields);
  revalidatePath("/projects/*");
};

// comments
export async function postCommentAction(comment: unknown) {
  await postComment(comment);
  revalidatePath("/projects/*");
}
