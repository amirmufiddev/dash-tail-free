import TaskBoard from "@/components/task-board";
import React, { Suspense } from "react";
import { connection } from "next/server";
import {
  getBoards,
  getTasks,
  getSubtasks,
  getComments,
} from "@/config/project-config";
import LayoutLoader from "@/components/layout-loader";

type TaskPageProps = {
  params: Promise<{ id: string }>;
};

async function ProjectTaskContent({ params }: TaskPageProps) {
  await connection();
  await params;
  const boards = await getBoards();
  const tasks = await getTasks();
  const subTasks = await getSubtasks();
  const comments = await getComments();
  return (
    <TaskBoard
      boards={boards}
      tasks={tasks}
      subTasks={subTasks}
      comments={comments}
    />
  );
}

const task = ({ params }: TaskPageProps) => {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <ProjectTaskContent params={params} />
    </Suspense>
  );
};

export default task;
