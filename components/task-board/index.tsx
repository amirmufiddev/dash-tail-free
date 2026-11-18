"use client";
import React from "react";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import TaskHeader from "./task-header";
import { useState } from "react";
import Board from "./board";
import Task from "./task";
import CreateBoard from "./create-borad";
import Blank from "@/components/blank";
import { Button } from "@/components/ui/button";
import AddTask from "./add-task";
import TaskSheet from "./task-sheet";
import TaskTable from "./task-list/task-table";
import TaskList from "./task-list";
import { toast } from "react-hot-toast";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { swapBoardAction } from "@/action/project-action";
import type {
  BoardRecord,
  CommentRecord,
  SubTaskRecord,
  TaskRecord,
} from "./types";

const wait = () => new Promise((resolve) => setTimeout(resolve, 1000));

const TaskBoard = ({
  boards,
  tasks,
  subTasks,
  comments,
}: {
  boards: BoardRecord[];
  tasks: TaskRecord[];
  subTasks: SubTaskRecord[];
  comments: CommentRecord[];
}) => {
  const [taskView, setTaskView] = useState("kanban");

  const [open, setOpen] = useState(false);
  const [open2, setOpen2] = useState(false);
  const [open3, setOpen3] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = React.useState<
    string | number | null
  >(null);
  const [selectedBoard, setSelectedBoard] = React.useState<BoardRecord | null>(
    null
  );
  const [selectedTaskId, setSelectedTaskId] = React.useState<
    string | number | null
  >(null);
  const [selectedTask, setSelectedTask] = React.useState<TaskRecord | null>(
    null
  );
  const [selectedBoardForTask, setSelectedBoardForTask] = React.useState<
    string | number | null
  >(null);

  const taskViewHandler = (value: string) => {
    setTaskView(value);
  };

  const openCreateBoard = () => {
    setSelectedBoardId(null);
    setSelectedBoard(null);
    setOpen(true);
  };

  const openEdit = (board: BoardRecord) => {
    setSelectedBoardId(board.id);
    setSelectedBoard(board);
    setOpen(true);
  };

  const closeCreateBoard = () => {
    setSelectedBoardId(null);
    setSelectedBoard(null);
    setOpen(false);
    wait().then(() => (document.body.style.pointerEvents = "auto"));
  };

  const handleTaskOpener = (boardId: string | number | null) => {
    setSelectedTaskId(null);
    setSelectedTask(null);
    setSelectedBoardForTask(boardId);
    setOpen2(true);
  };

  const closeTaskHandler = () => {
    setSelectedTaskId(null);
    setSelectedTask(null);
    setSelectedBoardForTask(null);
    setOpen2(false);
  };

  const updateTaskHandler = (task: TaskRecord) => {
    setSelectedTaskId(task.id);
    setSelectedTask(task);
    setOpen3(true);
  };

  const closeUpdateTaskHandler = () => {
    setSelectedTaskId(null);
    setSelectedTask(null);
    setOpen3(false);
  };

  const filteredTasks = (list: TaskRecord[], boardId: string | number) =>
    list?.filter((task) => task.boardId === boardId);

  const [, startTransition] = React.useTransition();
  const boardsId = React.useMemo(
    () => boards.map((board) => board.id),
    [boards]
  );
  const tasksIds = React.useMemo(() => tasks.map((task) => task.id), [tasks]);
  const [activeBoard, setActiveBoard] = React.useState<BoardRecord | null>(
    null
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === "Column") {
      const board = event.active.data.current.board as BoardRecord | undefined;
      setActiveBoard(board ?? null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeBoardId = active.id;
    const overBoardId = over.id;
    if (activeBoardId === overBoardId) return;

    const oldIndex = boardsId.indexOf(String(activeBoardId));
    const newIndex = boardsId.indexOf(String(overBoardId));

    if (oldIndex !== newIndex) {
      const data = {
        activeBoardId,
        overBoardId,
      };
      startTransition(async () => {
        await swapBoardAction(data);
        toast.success("Successfully update");
      });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  const onDragOver = () => {
    console.log("ami k");
  };

  return (
    <>
      {boards?.length > 0 ? (
        <Card className="overflow-y-auto">
          <CardHeader className="border-none pt-6 mb-6">
            <TaskHeader
              taskView={taskView}
              taskViewHandler={taskViewHandler}
              openCreateBoard={openCreateBoard}
            />
          </CardHeader>
          <CardContent>
            {taskView === "kanban" && (
              <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                collisionDetection={closestCorners}
                onDragOver={onDragOver}
              >
                <div className="overflow-x-auto">
                  <div className="flex flex-nowrap gap-6">
                    <SortableContext items={boardsId}>
                      {boards?.map((board) => (
                        <Board
                          key={`board-id-${board.id}`}
                          board={board}
                          onEdit={openEdit}
                          taskHandler={(id) => handleTaskOpener(id)}
                          isTaskOpen={open2}
                          showButton={
                            !open2 || selectedBoardForTask !== board.id
                          }
                        >
                          <SortableContext items={tasksIds}>
                            {filteredTasks(tasks, board.id)?.map(
                              (filteredTask, j) => (
                                <Task
                                  key={`task-key-${j}`}
                                  task={filteredTask}
                                  onUpdateTask={updateTaskHandler}
                                  boards={boards}
                                />
                              )
                            )}
                          </SortableContext>
                          {open2 && selectedBoardForTask === board.id && (
                            <AddTask
                              onClose={closeTaskHandler}
                              boardId={selectedBoardForTask}
                            />
                          )}
                        </Board>
                      ))}
                    </SortableContext>
                  </div>
                </div>

                <DragOverlay adjustScale={false}>
                  {activeBoard && (
                    <Board board={activeBoard}>
                      {filteredTasks(tasks, activeBoard.id)?.[0] && (
                        <Task
                          task={filteredTasks(tasks, activeBoard.id)[0]}
                          boards={boards}
                        />
                      )}
                    </Board>
                  )}
                </DragOverlay>
              </DndContext>
            )}

            {taskView === "list" &&
              boards.map((board) => (
                <TaskList
                  key={`list-view-key-${board.id}`}
                  board={board}
                  onEdit={openEdit}
                  length={filteredTasks(tasks, board.id).length}
                >
                  <TaskTable
                    boards={boards}
                    data={filteredTasks(tasks, board.id)}
                    onUpdateTask={updateTaskHandler}
                    boardID2={board.id}
                  />
                </TaskList>
              ))}
          </CardContent>
        </Card>
      ) : (
        <Blank className="max-w-[353px] mx-auto space-y-4">
          <div className=" text-xl font-semibold text-default-900">
            No Task Here
          </div>
          <div className=" text-default-600 text-sm">
            There is no task create. If you create a new task then click this
            button & create a new board.
          </div>
          <Button onClick={openCreateBoard}>
            <Plus className="w-4 h-4 mr-1" /> Create Board
          </Button>
        </Blank>
      )}
      <CreateBoard
        open={open}
        onClose={closeCreateBoard}
        board={selectedBoard}
        boardId={selectedBoardId}
      />
      <TaskSheet
        open={open3}
        onClose={closeUpdateTaskHandler}
        task={selectedTask}
        taskId={selectedTaskId}
        subTasks={subTasks}
        comments={comments}
      />
    </>
  );
};

export default TaskBoard;