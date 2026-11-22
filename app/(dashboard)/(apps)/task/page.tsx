import { Suspense } from "react";
import { connection } from "next/server";
import { getTasks } from "@/config/project-config";
import { getContacts } from "../chat/chat-config";
import LayoutLoader from "@/components/layout-loader";
import ViewTask from "./view-task";

async function TaskContent() {
  await connection();
  const tasks = await getTasks();
  const contacts = await getContacts();

  return (
    <>
      <ViewTask contacts={contacts} tasks={tasks} />
    </>
  );
}

const TaskPage = () => {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <TaskContent />
    </Suspense>
  );
};

export default TaskPage;
