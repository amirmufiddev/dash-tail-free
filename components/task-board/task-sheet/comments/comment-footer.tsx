"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

import { postCommentAction } from "@/action/project-action";
import avatar from "@/public/images/avatar/avatar-7.jpg";
import { SendHorizontal } from "lucide-react";

const CommentFooter = ({ taskId }: { taskId: string | number }) => {
  const [message, setMessage] = useState("");
  const handleChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setMessage(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight - 15}px`;
  };

  const submitMessage = async () => {
    const newMessage = {
      name: "CodeShaper",
      avatar: avatar,
      text: message,
      date: formatDate(new Date()),
      subTaskId: taskId,
    };

    try {
      await postCommentAction(newMessage);
      setMessage("");
    } catch (error) {
      console.log(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await submitMessage();
  };

  return (
    <>
      <div className="w-full flex items-end gap-4 px-4">
        <div className="flex-1">
          <form onSubmit={handleSubmit}>
            <div className="flex  gap-1 relative">
              <textarea
                value={message}
                placeholder="Type your message..."
                className="bg-default-100 rounded-xl break-words px-3 flex-1 h-10 pt-2 p-1 "
                onChange={handleChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void submitMessage();
                  }
                }}
                style={{
                  minHeight: "40px",
                  maxHeight: "120px",
                  overflowY: "auto",
                  resize: "none",
                }}
              />
            </div>
          </form>
        </div>
        <Button
          type="button"
          size="icon"
          className="rounded-full h-10 w-10"
          onClick={() => void submitMessage()}
        >
          <SendHorizontal className="w-4 h-4" />
        </Button>
      </div>
    </>
  );
};

export default CommentFooter;