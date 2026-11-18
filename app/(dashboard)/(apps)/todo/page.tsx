"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTodos,
  createTodo,
  deleteTodo,
  updateTodo,
  type TodoDraft,
  type TodoItem,
} from "./todo-layout";
import { useForm, type UseFormHandleSubmit, type UseFormRegister } from "react-hook-form";

function TodoList({
  item,
  onDelete,
  onEdit,
}: {
  item: TodoItem;
  onDelete: (id: number) => void;
  onEdit: (todo: TodoItem) => void;
}) {
  const { title } = item;
  return (
    <li className=" px-6 py-3 text-default-900 flex space-x-5">
      <div className=" grow">{title}</div>
      <div>{item.id}</div>
      <button className=" text-blue-500 underline" onClick={() => onEdit(item)}>
        Edit
      </button>
      <button
        className=" text-red-500 underline"
        onClick={() => onDelete(item.id)}
      >
        Delete
      </button>
    </li>
  );
}

function TodoAddEditBox({
  onSubmit,
  register,
  isLoading,
  handleSubmit,
  todo,
}: {
  onSubmit: (data: TodoDraft) => void;
  register: UseFormRegister<TodoDraft>;
  isLoading: boolean;
  handleSubmit: UseFormHandleSubmit<TodoDraft>;
  todo: TodoItem | null;
}) {
  return (
    <form
      className="flex  items-center space-x-5"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="flex-1">
        <input
          {...register("title", {
            required: true,
          })}
          type="text"
          defaultValue={todo ? todo.title : ""}
          placeholder="add todo"
          className=" bg-slate-200 block w-full h-12 px-2 rounded-md shadow-sm   placeholder:capitalize"
        />
      </div>

      <div className="flex-none">
        <button
          className=" inline-block px-6 py-3 rounded-md bg-blue-500 text-primary-foreground hover:bg-blue-500/80"
          disabled={isLoading}
        >
          {todo ? "Save" : "Add"}
        </button>
      </div>
    </form>
  );
}

const DataPage = () => {
  const [selectedTodo, setSelectedTodo] = useState<TodoItem | null>(null);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<TodoDraft>();

  const {
    isLoading: isGetting,
    isError,
    data,
    error,
    isFetching,
    isPlaceholderData,
  } = useQuery({
    queryKey: ["todos", page],
    queryFn: () => getTodos(page),
    placeholderData: (previousData: TodoItem[] | undefined) => previousData,
  });
  // simple way
  // const todoMutation = useMutation(createTodo, {
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ["todos"] });
  //   },
  // });
  // advanced way
  const todoMutation = useMutation({
    mutationFn: createTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
  const updateMutation = useMutation({
    mutationFn: updateTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });

  const onDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const openEditTodo = (todo: TodoItem) => {
    setSelectedTodo(todo);
  };
  const handleEditTodo = (updatedTodo: TodoDraft) => {
    if (!selectedTodo) return;
    updateMutation.mutate({
      id: selectedTodo.id,
      todo: updatedTodo,
    });
  };

  const onSubmit = (data: TodoDraft) => {
    const { title } = data;
    if (selectedTodo) {
      handleEditTodo({ title });
    } else {
      todoMutation.mutate({ title });
    }

    reset();
    setSelectedTodo(null);
  };
  if (isGetting) {
    return <span>Loading...</span>;
  }

  if (isError) {
    return <span>Error: {error.message}</span>;
  }

  return (
    <div className=" ">
      <div className="bg-background  p-10 shadow-md rounded-lg space-y-5">
        <div>
          <button onClick={() => setPage(1)}>page 1</button>
          <button onClick={() => setPage(2)}>page 2</button>
          <button onClick={() => setPage(3)}>page 3</button>
        </div>
        <div>{todoMutation.isPending ? "add hosse" : ""}</div>
        <TodoAddEditBox
          register={register}
          handleSubmit={handleSubmit}
          isLoading={todoMutation.isPending}
          onSubmit={onSubmit}
          todo={selectedTodo}
        />
        {errors.title && (
          <div className=" text-red-500  text-sm -mt-1.5">
            {errors.title && <span>This field is required</span>}
          </div>
        )}
        <ul className=" divide-purple-300 divide-y">
          {data?.map((item, i) => (
            <TodoList
              key={i}
              item={item}
              onDelete={onDelete}
              onEdit={openEditTodo}
            ></TodoList>
          ))}
        </ul>
      </div>
      <span>Current Page: {page + 1}</span>
      <button
        onClick={() => setPage((old) => Math.max(old - 1, 0))}
        disabled={page === 0}
      >
        Previous Page
      </button>{" "}
      <button
        onClick={() => {
          if (!isPlaceholderData) {
            setPage((old) => old + 1);
          }
        }}
        disabled={isPlaceholderData}
      >
        Next Page
      </button>
      {isFetching ? <span> Loading...</span> : null}{" "}
    </div>
  );
};

export default DataPage;
