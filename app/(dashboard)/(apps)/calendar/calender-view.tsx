"use client";
import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react"; // must go before plugins
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { Draggable } from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import EventSheet from "./event-sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import ExternalDraggingevent from "./dragging-events";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const wait = () => new Promise((resolve) => setTimeout(resolve, 1000));
type CalendarCategory = {
  value: string;
  label: string;
  className?: string;
};

type CalendarEventSelection = {
  event?: {
    id?: string;
    start?: Date | null;
    end?: Date | null;
    title?: string;
    extendedProps?: { calendar?: string };
  };
  title?: string;
};

const CalendarView = ({ events, categories }: { events: { extendedProps: { calendar: string } }[]; categories: CalendarCategory[] }) => {
  const [selectedCategory, setSelectedCategory] = useState<string[]>(
    () => categories?.map((c) => c.value) ?? []
  );
  const [selectedEventDate, setSelectedEventDate] = useState<{ date: Date } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventSelection | null>(null);
  const [draggableInitialized, setDraggableInitialized] = useState(false);

  // event canvas state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [date, setDate] = React.useState(new Date());

  const [dragEvents] = useState([
    { title: "New Event Planning", id: "101", tag: "business" },
    { title: "Meeting", id: "102", tag: "meeting" },
    { title: "Generating Reports", id: "103", tag: "holiday" },
    { title: "Create New theme", id: "104", tag: "etc" },
  ]);

  useEffect(() => {
    setSelectedCategory(categories?.map((c) => c.value) ?? []);
  }, [events, categories]);

  useEffect(() => {
    const draggableEl = document.getElementById("external-events");

    const initDraggable = () => {
      if (draggableEl) {
        new Draggable(draggableEl, {
          itemSelector: ".fc-event",
          eventData: function (eventEl) {
            let title = eventEl.getAttribute("title");
            let id = eventEl.getAttribute("data");
            let event = dragEvents.find((e) => e.id === id);
            let tag = event ? event.tag : "";
            return {
              title: title,
              id: id,
              extendedProps: {
                calendar: tag,
              },
            };
          },
        });
      }
    };

    if (dragEvents.length > 0) {
      initDraggable();
    }

    return () => {
      draggableEl?.removeEventListener("mousedown", initDraggable);
    };
  }, [dragEvents]);
  // event click
  const handleEventClick = (arg: {
    event: {
      id: string;
      start: Date | null;
      end: Date | null;
      title: string;
      extendedProps: { calendar?: unknown };
    };
  }) => {
    const calendar = arg.event.extendedProps.calendar;
    setSelectedEventDate(null);
    setSheetOpen(true);
    setSelectedEvent({
      title: arg.event.title,
      event: {
        id: arg.event.id,
        start: arg.event.start,
        end: arg.event.end,
        title: arg.event.title,
        extendedProps: {
          calendar: typeof calendar === "string" ? calendar : undefined,
        },
      },
    });
    wait().then(() => (document.body.style.pointerEvents = "auto"));
  };
  // handle close modal
  const handleCloseModal = () => {
    setSheetOpen(false);
    setSelectedEvent(null);
    setSelectedEventDate(null);
  };
  const handleDateClick = (date: Date) => {
    setSheetOpen(true);
    setSelectedEventDate({ date });
    setSelectedEvent(null);
    wait().then(() => (document.body.style.pointerEvents = "auto"));
  };

  const handleCategorySelection = (category: string) => {
    setSelectedCategory((prev) => {
      const current = prev ?? [];
      if (current.includes(category)) {
        return current.filter((c) => c !== category);
      }
      return [...current, category];
    });
  };

  const handleClassName = (arg: { event: { extendedProps: { calendar?: unknown } } }) => {
    const calendar = arg.event.extendedProps.calendar;
    if (calendar === "holiday") {
      return "destructive";
    } else if (calendar === "business") {
      return "primary";
    } else if (calendar === "personal") {
      return "success";
    } else if (calendar === "family") {
      return "info";
    } else if (calendar === "etc") {
      return "info";
    } else if (calendar === "meeting") {
      return "warning";
    }
    return "";
  };
  const filteredEvents = events?.filter((event) =>
    selectedCategory?.includes(event.extendedProps.calendar)
  );

  return (
    <>
      <div className=" grid grid-cols-12 gap-6 divide-x  divide-border">
        <Card className="col-span-12 lg:col-span-4 2xl:col-span-3  pb-5">
          <CardContent className="p-0 ">
            <CardHeader className="border-none mb-2 pt-5">
              <Button onClick={() => handleDateClick(new Date())}>
                <Plus className="w-4 h-4 text-primary-foreground mr-1" />
                Add Event
              </Button>
            </CardHeader>
            <div className="px-3">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(selected) => {
                  if (selected) handleDateClick(selected);
                }}
                className="rounded-md border w-full p-0 border-none"
              />
            </div>

            <div id="external-events" className=" space-y-1.5 mt-6 px-4">
              <p className=" text-sm font-medium text-default-700 pb-2">
                Drag and drop your event or click in the calendar
              </p>
              {dragEvents.map((event) => (
                <ExternalDraggingevent key={event.id} event={event} />
              ))}
            </div>
            <div className="py-4 text-default-800  font-semibold text-xs uppercase mt-4 px-4">
              FILTER
            </div>
            <ul className=" space-y-2 px-4">
              <li className=" flex gap-3">
                <Checkbox
                  checked={selectedCategory?.length === categories?.length}
                  onClick={() => {
                    if (selectedCategory?.length === categories?.length) {
                      setSelectedCategory([]);
                    } else {
                      setSelectedCategory(categories.map((c) => c.value));
                    }
                  }}
                />
                <Label>All</Label>
              </li>
              {categories?.map((category) => (
                <li className=" flex gap-3 " key={category.value}>
                  <Checkbox
                    className={category.className}
                    id={category.label}
                    checked={selectedCategory.includes(category.value)}
                    onClick={() => handleCategorySelection(category.value)}
                  />
                  <Label htmlFor={category.label}>{category.label}</Label>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="col-span-12 lg:col-span-8 2xl:col-span-9  pt-5">
          <CardContent className="dash-tail-calendar">
            <FullCalendar
              plugins={[
                dayGridPlugin,
                timeGridPlugin,
                interactionPlugin,
                listPlugin,
              ]}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
              }}
              events={filteredEvents}
              editable={true}
              rerenderDelay={10}
              eventDurationEditable={false}
              selectable={true}
              selectMirror={true}
              droppable={true}
              dayMaxEvents={2}
              weekends={true}
              eventClassNames={handleClassName}
              dateClick={(arg) => handleDateClick(arg.date)}
              eventClick={handleEventClick}
              initialView="dayGridMonth"
            />
          </CardContent>
        </Card>
      </div>
      <EventSheet
        open={sheetOpen}
        onClose={handleCloseModal}
        categories={categories}
        event={selectedEvent}
        selectedDate={selectedEventDate}
      />
    </>
  );
};

export default CalendarView;
