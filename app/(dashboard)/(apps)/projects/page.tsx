import { Suspense } from "react";
import { connection } from "next/server";
import { getProjects } from "@/config/project-config";
import LayoutLoader from "@/components/layout-loader";
import ProjectsView from "./projects-view";

async function ProjectsContent() {
  await connection();
  const projects = await getProjects();

  return (
    <div>
      <ProjectsView projects={projects} />
    </div>
  );
}

export default function ProjectPage() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <ProjectsContent />
    </Suspense>
  );
}
