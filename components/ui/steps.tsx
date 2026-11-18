import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { Icon } from "@iconify/react";
const stepVariants = cva(
  " flex   break-words [&_[step-box]]:font-medium  [&_[step-box=disable]]:text-foreground/70 [&_[step-box=completed]]:text-primary-foreground [&_[step-box=current]]:text-primary [&_[step-box=current]]:bg-background  ",
  {
    variants: {
      variant: {
        default:
          "[&_[step-bar-bg=disable]]:before:bg-default-200 [&_[step-bar-bg=current]]:before:bg-default-200 [&_[step-bar-bg=completed]]:before:bg-primary [&_[step-box=current]]:border-2 [&_[step-box=current]]:border-primary [&_[step-box=completed]]:bg-primary   [&_[step-box=disable]]:bg-default-200 [&_[step-box=error]]:bg-destructive [&_[step-box=error]]:text-destructive-foreground  ",
      },
      size: {
        sm: "[&_[step-box]]:h-5 [&_[step-box]]:w-5 [&_[step-box]]:text-[10px]",
        md: "[&_[step-box]]:h-8 [&_[step-box]]:w-8 [&_[step-box]]:text-xs",
        lg: "[&_[step-box]]:h-9 [&_[step-box]]:w-9 [&_[step-box]]:text-sm ",
        xl: "[&_[step-box]]:h-10 [&_[step-box]]:w-10 [&_[step-box]]:text-base",
      },
      content: {
        right: "flex-row",
        bottom: "flex-col",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "lg",
      content: "bottom",
    },
  }
);
const stepperVariants = cva("flex ", {
  variants: {
    direction: {
      horizontal: "flex-row items-center",
      vertical: "flex-col items-baseline",
    },
  },

  defaultVariants: {
    direction: "horizontal",
  },
});

type StepSharedProps = {
  activeStep?: number;
  direction?: "horizontal" | "vertical" | "" | false;
  completed?: boolean;
  disabled?: boolean;
  variant?: VariantProps<typeof stepVariants>["variant"];
  size?: VariantProps<typeof stepVariants>["size"];
  current?: number;
  content?: VariantProps<typeof stepVariants>["content"];
  icon?: React.ReactNode;
  alternativeLabel?: boolean;
  gap?: boolean | string;
  status?: string;
  isLast?: boolean;
  count?: number;
  index?: number;
  isBeforeLast?: boolean;
};

export type StepperProps = React.OlHTMLAttributes<HTMLOListElement> &
  StepSharedProps;

const Stepper = React.forwardRef<HTMLOListElement, StepperProps>(
  (
    {
      className,
      children,
      activeStep,
      direction,
      disabled,
      variant,
      size,
      current,
      content,
      icon,
      alternativeLabel,
      gap,
      status,
      ...props
    },
    ref
  ) => {
    const childItem = React.Children.toArray(children);
    return (
      <ol
        ref={ref}
        className={cn(
          stepperVariants({
            direction: direction === "vertical" ? "vertical" : "horizontal",
          }),
          className,
          {
          "gap-2": gap,
          " text-center": alternativeLabel,
          "gap-3": content === "right",
        })}
        {...props}
      >
        {childItem.map((child, index) => {
          if (!React.isValidElement<StepProps>(child)) return child;
          const isLast = index === childItem.length - 1;
          const isBeforeLast = index === childItem.length - 2;
          const count = index + 1;
          return React.cloneElement(child, {
            ...props,
            isLast,
            activeStep: activeStep,
            disabled: disabled && !isLast,
            count,
            index: index,
            current: current,
            ...child.props,
            gap: gap,
            direction: direction,
            alternativeLabel: alternativeLabel,
            isBeforeLast: isBeforeLast,
            content: content,
            status: status,
            size: size,
            className: cn(
              stepVariants({ variant, size, content }),
              child.props.className
            ),
          } as StepProps);
        })}
      </ol>
    );
  }
);
Stepper.displayName = "Stepper";

export type StepProps = React.LiHTMLAttributes<HTMLLIElement> & StepSharedProps;

const Step = React.forwardRef<HTMLLIElement, StepProps>(
  (
    {
      className,
      children,
      variant,
      size,
      isLast,
      count,
      current,
      content,
      index,
      icon,
      gap,
      direction,
      alternativeLabel,
      isBeforeLast,
      status,
      completed,
      ...props
    },
    ref
  ) => {
    const getStepBarBg = (current: number | undefined, index: number | undefined) => {
      if (current === undefined || index === undefined) return "";
      if (current > index) return "completed";
      if (current < index) return "disable";
      if (current === index) return "current";
      return "";
    };

    const stepBarBg = getStepBarBg(current, index);

    const getStepBox = (
      current: number | undefined,
      index: number | undefined,
      status: string | undefined
    ) => {
      if (current === undefined || index === undefined) return "";
      if (status === "error" && current === index) {
        return "error";
      }
      if (current > index) return "completed";
      if (current < index) return "disable";
      if (current === index) return "current";
      return "";
    };

    const stepBox = getStepBox(current, index, status);
    // Check if content is 'right'
    const isContentRight = content === "right";
    // Check if any of the specific props are present
    const hasSpecificProps =
      gap !== undefined ||
      alternativeLabel !== undefined ||
      direction !== undefined;
    // has render
    const renderChildren =
      !isContentRight || (isContentRight && !hasSpecificProps);
    return (
      <li
        ref={ref}
        className={cn(stepVariants({ variant, size, content }), className, {
          "flex-row space-x-4 min-h-[80px]": direction === "vertical",
          "flex-1": !isLast,
          "last:flex-1": alternativeLabel && isLast,
          "last:flex-none": alternativeLabel && isLast && gap,
        })}
        {...props}
      >
        <div
          step-bar-bg={stepBarBg}
          className={cn("flex items-center flex-row relative z-[1] ", {
            "flex-col  ": direction === "vertical",

            " before:absolute  before:z-[-1]   before:top-1/2 before:-translate-y-1/2 before:w-full ":
              !isLast && direction !== "vertical",
            "before:left-[44px] before:w-[calc(100%-44px)]":
              gap && !alternativeLabel,
            "before:left-1/2 ": alternativeLabel && !gap,
            "before:left-[calc(50%+33px)] before:w-[calc(100%-60px)]":
              alternativeLabel && gap,
            "before:w-[calc(100%-85px)]":
              alternativeLabel && gap && isBeforeLast,
            "flex-1 before:h-0.5  ": isContentRight,
            "before:h-1": !isContentRight,
          })}
        >
          <span
            className={cn(
              "flex-none   inline-flex items-center justify-center rounded-full relative z-20 leading-none ",
              {
                "mx-auto": alternativeLabel,
                "[&>svg]:w-5 [&>svg]:h-5": size !== "sm",
                "[&>svg]:w-3 [&>svg]:h-3": size === "sm",
              }
            )}
            step-box={stepBox}
          >
            {stepBarBg === "completed" ? <Check /> : icon ? icon : count}
          </span>
          {isContentRight && renderChildren && (
            <div className=" bg-card px-3">{children}</div>
          )}

          {!isLast && direction === "vertical" && (
            <div
              className={cn(
                "h-full w-1 grow  before:absolute before:h-full  before:w-full relative",
                {
                  "before:top-[10px] before:h-[calc(100%-10px)] ": gap,
                }
              )}
              step-bar-bg={stepBarBg}
            />
          )}
        </div>
        {!isContentRight && renderChildren && <div>{children}</div>}
      </li>
    );
  }
);
Step.displayName = "Step";

const StepLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    error?: boolean;
    optional?: React.ReactNode;
    variant?: string;
  }
>(({ className, children, error, optional, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "text-sm text-default-600  font-medium mt-2",
          {
            "text-destructive": error,
            "text-xs": variant === "caption",
          },
          className
        )}
        {...props}
      >
        {children}
        {optional}
      </div>
    );
  }
);
StepLabel.displayName = "StepLabel";

const StepDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { error?: boolean }
>(({ className, children, error, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "text-sm  text-muted-foreground",
          {
            "text-destructive": error,
          },
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
StepDescription.displayName = "StepDescription";

export { Stepper, Step, StepLabel, StepDescription };
