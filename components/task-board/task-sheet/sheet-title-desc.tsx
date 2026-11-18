"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@iconify/react";
import { updateTaskAction } from "@/action/project-action";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TaskRecord } from "../types";

const schema = z.object({
  title: z.string().min(1, {
    message: "What is your task title? ???",
  }),
  desc: z.string().optional(),
});

type TaskTitleForm = z.infer<typeof schema>;

const SheetTitleDesc = ({
  task,
  taskId,
}: {
  task: TaskRecord;
  taskId: string | number;
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
    }, 3000);
  };

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TaskTitleForm>({
    resolver: zodResolver(schema),
    mode: "all",
  });

  const onSubmit = async (data: TaskTitleForm) => {
    const newData: TaskRecord = {
      ...task,
      title: data.title,
      desc: data.desc,
    };
    try {
      await updateTaskAction(taskId, newData);
    } catch (error) {
      console.log(error);
    }
  };

  React.useEffect(() => {
    setValue("title", String(task.title ?? ""));
    setValue("desc", String(task.desc ?? ""));
  }, [task, setValue]);

  return (
    <form
      className="py-5 px-6 pb-8 border-b border-default-200"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="flex items-center gap-1 mb-2">
        <Checkbox className="w-4 h-4" color="secondary" />

        <input
          type="text"
          {...register("title")}
          className="h-7 w-full border border-transparent text-sm font-medium text-default-900 rounded-sm focus:border focus:border-default-200 focus:outline-none px-1 focus:bg-default-50 bg-card"
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>
      {errors.title && (
        <div className=" text-destructive">
          {String(errors.title.message ?? "")}
        </div>
      )}
      <textarea
        {...register("desc")}
        className="w-full text-sm text-default-600 border border-transparent rounded-sm focus:border focus:border-default-200 focus:outline-none px-1 focus:bg-default-50 bg-card min-h-[80px]"
        placeholder="Add a description..."
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {isFocused && (
        <div className="flex justify-end gap-2 mt-2">
          <Button type="submit" size="sm">
            <Icon icon="heroicons:check" className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>
      )}
    </form>
  );
};

export default SheetTitleDesc;