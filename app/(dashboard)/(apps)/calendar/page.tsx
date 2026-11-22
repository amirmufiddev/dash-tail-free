import { Suspense } from "react";
import { connection } from "next/server";
import { getCategories, getEvents } from "@/config/calendar.config";
import LayoutLoader from "@/components/layout-loader";
import CalendarView from "./calender-view";

async function CalendarContent() {
  await connection();
  const events = await getEvents();
  const categories = await getCategories();
  return (
    <div>
      <CalendarView events={events?.data} categories={categories?.data} />
    </div>
  );
}

const CalenderPage = () => {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <CalendarContent />
    </Suspense>
  );
};

export default CalenderPage;
