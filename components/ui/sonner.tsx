import * as React from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

const SonnToaster = ({
  ...props
}: React.ComponentProps<typeof Sonner>) => {
  const { theme = "system" } = useTheme();
  const sonnerTheme: React.ComponentProps<typeof Sonner>["theme"] =
    theme === "light" || theme === "dark" || theme === "system"
      ? theme
      : "system";

  return (
    <Sonner
      theme={sonnerTheme}
      richColors
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { SonnToaster };
