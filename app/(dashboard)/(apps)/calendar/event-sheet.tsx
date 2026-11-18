import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, Controller } from "react-hook-form";
import { cn, formatDate } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CalendarIcon } from "lucide-react";
import {
  AddEvent,
  deleteEventAction,
  updateEventAction,
} from "@/action/calendar-action";
import toast from "react-hot-toast";
import DeleteConfirmationDialog from "@/components/delete-confirmation-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
const schema = z.object({
  title: z.string().min(3, { message: "Required" }),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  calendarProps: z.string().optional(),
});

type CalendarCategory = { value: string; label: string };
type CalendarEventSelection = {
  event?: {
    id?: string | number;
    start?: Date | string | number | null;
    end?: Date | string | number | null;
    title?: string;
    extendedProps?: { calendar?: string };
  };
  title?: string;
};

function toDate(value: Date | string | number | null | undefined, fallback: Date) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

const EventSheet = ({ open, onClose, categories, event, selectedDate }: { open: boolean; onClose: () => void; categories: CalendarCategory[]; event: CalendarEventSelection | null; selectedDate: { date: Date } | null }) => {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isPending, startTransition] = React.useTransition();
  const [calendarProps, setCalendarProps] = React.useState(categories[0]?.value ?? "");
  // delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [eventIdToDelete, setEventIdToDelete] = useState<string | number | null>(null);

  const {
    register,
    control,
    reset,
    setValue,
    formState: { errors },
    handleSubmit,
  } = useForm({
    resolver: zodResolver(schema),
    mode: "all",
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    startTransition(async () => {
      // if event is  null only create event

      if (!event) {
        const payload = {
          ...data,
          start: startDate,
          end: endDate,
          allDay: false,
          extendedProps: {
            calendar: calendarProps,
          },
        };

        let response = await AddEvent(payload);
        if (response?.status === "success") {
          toast.success(response?.message);
          reset();
          onClose();
        } else {
          toast.error(response?.message);
        }
      }
      // if event is not null only update event
      if (event) {
        const eventId = event.event?.id;
        if (eventId == null) {
          toast.error("Event ID not found");
          return;
        }
        let response = await updateEventAction(eventId, data);
        if (response?.status === "success") {
          toast.success(response?.message);
          reset();
          onClose();
        } else {
          toast.error(response?.message);
        }
      }
    });
  };
  useEffect(() => {
    if (selectedDate?.date) {
      setStartDate(selectedDate.date);
      setEndDate(selectedDate.date);
    }
    if (event?.event) {
      setStartDate(toDate(event.event.start, new Date()));
      setEndDate(toDate(event.event.end, new Date()));
      const eventCalendar = event.event.extendedProps?.calendar;
      setCalendarProps(eventCalendar || categories[0]?.value || "");
    }
    setValue("title", event?.event?.title || "");
  }, [event, selectedDate, open, categories, setValue]);

  const onDeleteEventAction = async () => {
    try {
      if (!eventIdToDelete) {
        toast.error("Event ID not found");
        return;
      }

      const response = await deleteEventAction(eventIdToDelete);
      if (response?.status === "success") {
        toast.success(response?.message);
        reset();
        onClose();
      } else {
        toast.error(response?.message);
        reset();
        onClose();
      }
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  const handleOpenDeleteModal = (eventId: string | number | null | undefined) => {
    if (eventId == null) return;
    setEventIdToDelete(eventId);
    setDeleteModalOpen(true);
    onClose();
  };

  return (
    <>
      <DeleteConfirmationDialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={onDeleteEventAction}
        defaultToast={false}
      />
      <Sheet open={open}>
        <SheetContent
          onPointerDownOutside={onClose}
          onClose={onClose}
          className="px-0"
        >
          <SheetHeader className="px-6">
            <SheetTitle>
              {event ? "Edit Event" : "Create Event"} {event?.title}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 h-full">
            <form className=" h-full" onSubmit={handleSubmit(onSubmit)}>
              <div className="h-[calc(100vh-130px)]">
                <ScrollArea className="h-full">
                  <div className="space-y-4 pb-5 px-6">
                    <div className=" space-y-1.5">
                      <Label htmlFor="title">Event Name</Label>
                      <Input
                        id="title"
                        type="text"
                        placeholder="Enter Event Name"
                        {...register("title")}
                      />
                      {errors && (
                        <div className=" text-destructive">
                          {String(errors?.title?.message ?? "")}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="startDate" className="mb-1.5">
                        Start Date
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-between text-left font-normal border-default-200 text-default-600",
                              !startDate && "text-muted-foreground"
                            )}
                          >
                            {startDate ? (
                              formatDate(startDate, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="h-4 w-4 " />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Controller
                            name="startDate"
                            control={control}
                            render={({ field }) => (
                              <Calendar
                                mode="single"
                                selected={startDate}
                                onSelect={(selected) => {
                                  if (selected) setStartDate(selected);
                                }}
                              />
                            )}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label htmlFor="endDate" className="mb-1.5">
                        End Date
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-between text-left font-normal border-default-200 text-default-600",
                              !endDate && "text-muted-foreground"
                            )}
                          >
                            {endDate ? (
                              formatDate(endDate, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className=" h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Controller
                            name="endDate"
                            control={control}
                            render={({ field }) => (
                              <Calendar
                                mode="single"
                                selected={endDate}
                                onSelect={(selected) => {
                                  if (selected) setEndDate(selected);
                                }}
                              />
                            )}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label htmlFor="calendarProps" className="mb-1.5">
                        Label
                      </Label>
                      <Controller
                        name="calendarProps"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={String(calendarProps)}
                            onValueChange={(data) => setCalendarProps(data)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Label" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem
                                  value={category.value}
                                  key={category.value}
                                >
                                  {category.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>
                </ScrollArea>
              </div>
              <div className="pb-12 flex flex-wrap gap-2 px-6">
                <Button type="submit" disabled={isPending} className="flex-1">
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {event ? "Updating..." : "Adding..."}
                    </>
                  ) : event ? (
                    "Update Event"
                  ) : (
                    "Add Event"
                  )}
                </Button>
                {event && (
                  <Button
                    type="button"
                    color="destructive"
                    onClick={() => handleOpenDeleteModal(event?.event?.id)}
                    className="flex-1"
                  >
                    Delete
                  </Button>
                )}
              </div>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default EventSheet;
