"use client";
import { useState } from "react";
import { Icon } from "@iconify/react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Link, Upload } from "lucide-react";

const Attachments = () => {
  const [files, setFiles] = useState<File[]>([]);
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      setFiles(acceptedFiles.map((file) => Object.assign(file)));
    },
  });
  const renderFilePreview = (file: File) => {
    if (file.type.startsWith("image")) {
      return (
        <Image
          width={48}
          height={48}
          alt={file.name}
          src={URL.createObjectURL(file)}
          className=" rounded border p-0.5"
        />
      );
    }
    return <Icon icon="tabler:file-description" />;
  };
  const handleRemoveFile = (file: File) => {
    setFiles((prev) => prev.filter((i) => i.name !== file.name));
  };
  const fileList = files.map((file, index) => (
    <div
      key={`${file.name}-${index}`}
      className=" flex justify-between border px-3.5 py-3 my-6 rounded-md"
    >
      <div className="flex space-x-3 items-center">
        <div className="file-preview">{renderFilePreview(file)}</div>
        <div>
          <div className=" text-sm  text-card-foreground">{file.name}</div>
          <div className=" text-xs font-light text-muted-foreground">
            {Math.round(file.size / 100) / 10 > 1000 ? (
              <>{(Math.round(file.size / 100) / 10000).toFixed(1)}</>
            ) : (
              <>{(Math.round(file.size / 100) / 10).toFixed(1)}</>
            )}
            {" kb"}
          </div>
        </div>
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="text-destructive"
        onClick={() => handleRemoveFile(file)}
      >
        <Icon icon="tabler:x" className="h-5 w-5" />
      </Button>
    </div>
  ));

  return (
    <div className="px-6 py-8">
      <div
        className="border border-dashed border-default-300 p-4 rounded-md"
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2 py-6">
          <Upload className="w-8 h-8 text-primary" />
          <div className="text-sm font-medium text-default-900">
            Drop files here or click to upload
          </div>
          <div className="text-xs text-default-500">
            Upload your task attachments
          </div>
        </div>
      </div>
      <div>{fileList}</div>
      <Button type="button" variant="outline" className="gap-2">
        <Link className="w-4 h-4" />
        Attach from URL
      </Button>
    </div>
  );
};

export default Attachments;