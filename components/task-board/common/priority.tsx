"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTaskAction } from "@/action/project-action";
import type { TaskRecord } from "../types";

const Priority = ({
  task,
  taskId,
}: {
  task: TaskRecord;
  taskId: string | number;
}) => {
  const [selectedPriority, setSelectedPriority] = useState(
    task.priority ?? "medium"
  );

  const handlePriorityChange = async (value: string) => {
    try {
      const newData: TaskRecord = {
        ...task,
        priority: value,
      };

      await updateTaskAction(taskId, newData);
    } catch (error) {
      console.log(error);
    }

    setSelectedPriority(value);
  };

  return (
    <>
      <div className="w-[100px]">
        <Select value={selectedPriority} onValueChange={handlePriorityChange}>
          <SelectTrigger size="sm" variant="flat" color="primary">
            <SelectValue placeholder="select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
};

export default Priority;