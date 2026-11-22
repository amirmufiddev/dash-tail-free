import React, { Suspense } from "react";
import { connection } from "next/server";
import { Card, CardFooter } from "@/components/ui/card";
import { getProject } from "@/config/project-config";

import ProjectHeader from "./project-header";
import PageLink from "./page-link";

async function ProjectSummaryCard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const project = await getProject(id);

  return (
    <Card className="mb-6">
      <ProjectHeader project={project} />
      <CardFooter className="gap-x-4 gap-y-3  lg:gap-x-6 pb-0 pt-6 flex-wrap">
        <PageLink id={id} />
      </CardFooter>
    </Card>
  );
}

const singleProjectLayout = (props: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) => {
  return (
    <div>
      <Suspense fallback={null}>
        <ProjectSummaryCard params={props.params} />
      </Suspense>
      {props.children}
    </div>
  );
};

export default singleProjectLayout;
