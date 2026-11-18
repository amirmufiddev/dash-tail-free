"use client";

import type { LegacyRow } from "@tanstack/react-table/legacy";
import { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import type { StaticImageData } from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

import type { ProjectAssignee, ProjectRow } from "../../types";
import { priorities, statuses } from "../data/data";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions";

function staticSrc(value?: StaticImageData | { src?: string }): string | undefined {
  if (!value) return undefined;
  if (typeof value === "object" && "src" in value) {
  return typeof value.src === "string" ? value.src : undefined;
  }
  return undefined;
}

export const columns: ColumnDef<ProjectRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className=" min-w-[40px]">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      </div>
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => {
      const logo = staticSrc(row.original.logo);
      return (
        <Link
          href={{
            pathname: `projects/${row.original.id}/overview`,
          }}
          className="flex items-center gap-2"
        >
          <Avatar className="rounded-sm  h-8 w-8">
            <AvatarImage src={logo} />
            <AvatarFallback className="bg-success/30 text-success">
              {row.original.title.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="max-w-[140px] truncate  ">
            <span className="font-semibold text-default-900 capitalize">
              {row.getValue("title") as string}
            </span>
          </div>
        </Link>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const statusValue = row.getValue("status") as string;
      const status = statuses.find((item) => item.value === statusValue);

      if (!status) {
        return null;
      }

      return (
        <div className="flex  items-center">
          <Badge
            variant="soft"
            color={status.color}
            className="whitespace-normal"
          >
            {status.label}
          </Badge>
        </div>
      );
    },
    filterFn: (row, id, value: string[]) =>
      value.includes(row.getValue(id) as string),
  },
  {
    accessorKey: "assign",
    header: "Team",
    cell: ({ row }) => {
      const assignees = row.original.assign ?? [];
      return (
        <AvatarGroup max={3} total={assignees.length} countClass="w-7 h-7">
          {assignees.map((item: ProjectAssignee, i) => (
            <Avatar
              key={`assined-team-member-${i}`}
              className=" ring-1 ring-background ring-offset-[2px]  ring-offset-background h-7 w-7"
            >
              <AvatarImage src={staticSrc(item.image)} />
              <AvatarFallback>AB</AvatarFallback>
            </Avatar>
          ))}
        </AvatarGroup>
      );
    },
  },
  {
    accessorKey: "percentage",
    header: "Progress",
    cell: ({ row }) => {
      const percentage = Number(row.getValue("percentage") ?? 0);
      return (
        <div className="min-w-[190px]">
          <div className="flex justify-end mb-2">
            <Label className="text-end">{percentage}%</Label>
          </div>
          <Progress value={percentage} size="sm" />
        </div>
      );
    },
  },
  {
    accessorKey: "priority",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Priority" />
    ),
    cell: ({ row }) => {
      const priorityValue = row.getValue("priority") as string;
      const priority = priorities.find((item) => item.value === priorityValue);

      if (!priority) {
        return null;
      }

      return (
        <Badge color={priority.color} className="whitespace-nowrap">
          {priority.label} priority
        </Badge>
      );
    },
    filterFn: (row, id, value: string[]) =>
      value.includes(row.getValue(id) as string),
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => (
      <div className="text-sm font-medium text-default-600 whitespace-nowrap">
        {row.getValue("dueDate") as string}
      </div>
    ),
  },
  {
    id: "actions",
    header: "Action",
    cell: ({ row }: { row: LegacyRow<ProjectRow> }) => (
      <DataTableRowActions row={row} />
    ),
  },
];