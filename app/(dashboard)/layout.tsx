import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LayoutLoader from "@/components/layout-loader";
import MainLayout from "./main-layout";

export const instant = false;

async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/");
  }

  return <MainLayout>{children}</MainLayout>;
}

const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </Suspense>
  );
};

export default layout;
