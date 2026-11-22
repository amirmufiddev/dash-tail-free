import React, { Suspense } from "react";
import { connection } from "next/server";

import Mail from "./components/mail";
import { cookies } from "next/headers";
import { getEmails } from "@/config/email.config";
import { accounts } from "./data";
import { getContacts } from "../chat/chat-config";
import LayoutLoader from "@/components/layout-loader";

async function EmailContent() {
  await connection();
  const cookieStore = await cookies();
  const layout = cookieStore.get("react-resizable-panels:layout");
  const collapsed = cookieStore.get("react-resizable-panels:collapsed");
  const defaultLayout = layout ? JSON.parse(layout.value) : undefined;
  const defaultCollapsed = collapsed ? JSON.parse(collapsed.value) : undefined;
  const contacts = await getContacts();
  const mails = await getEmails();

  return (
    <Mail
      accounts={accounts}
      mails={mails?.data}
      defaultLayout={defaultLayout}
      defaultCollapsed={defaultCollapsed}
      navCollapsedSize={4}
      contacts={contacts}
    />
  );
}

const EmailPage = () => {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <EmailContent />
    </Suspense>
  );
};

export default EmailPage;
