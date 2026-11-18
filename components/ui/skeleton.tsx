import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: { className: string; [key: string]: unknown }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-default-200", className)}
      {...props}
    />
  );
}

export { Skeleton };
