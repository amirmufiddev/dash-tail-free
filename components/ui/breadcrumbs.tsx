import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const breadcrumbItemsVariants = cva(
  " flex gap-1 items-center transition  underline-offset-4 ",
  {
    variants: {
      color: {
        default:
          "text-default-600 hover:default-600/80 data-[state=active]:text-primary aria-[current=page]:text-primary",
        primary:
          "text-primary/80 hover:text-primary/60 data-[state=active]:text-primary aria-[current=page]:text-primary",
        success:
          "text-success/80 hover:text-success/60 data-[state=active]:text-success aria-[current=page]:text-success",
        info: "text-info/80 hover:text-info/60 data-[state=active]:text-info aria-[current=page]:text-info",
        warning:
          "text-warning/80  hover:text-warning/60 data-[state=active]:text-warning aria-[current=page]:text-warning",
        destructive:
          "text-destructive/80  hover:text-destructive/60 data-[state=active]:text-destructive aria-[current=page]:text-destructive",
      },

      underline: {
        none: "no-underline",
        hover: "hover:underline",
        always: "underline",
        active: "active:underline",
        focus: "focus:underline",
      },
      size: {
        md: "text-base",
        sm: "text-sm",
        lg: "text-lg",
      },
    },

    defaultVariants: {
      color: "default",
      size: "md",
      underline: "none",
    },
  }
);
const breadcrumbsVariants = cva(" flex flex-wrap list-none max-w-fit ", {
  variants: {
    variant: {
      default: "default-style",
      solid: " bg-muted p-3 rounded",
      bordered: "border-2 border-border rounded p-3",
    },
  },

  defaultVariants: {
    variant: "default",
  },
});

export interface BreadcrumbsProps
  extends Omit<React.OlHTMLAttributes<HTMLOListElement>, "children" | "color">,
    Omit<VariantProps<typeof breadcrumbsVariants>, "variant"> {
  children?: React.ReactNode;
  maxItems?: number;
  itemsBeforeCollapse?: number;
  itemsAfterCollapse?: number;
  color?: VariantProps<typeof breadcrumbItemsVariants>["color"] | (string & {});
  size?: VariantProps<typeof breadcrumbItemsVariants>["size"];
  underline?: VariantProps<typeof breadcrumbItemsVariants>["underline"] | (string & {});
  variant?: VariantProps<typeof breadcrumbsVariants>["variant"] | (string & {});
  modifier?: string;
  onAction?: (key: string | number) => void;
  disabled?: boolean;
  separator?: React.ReactNode;
  renderEllipsis?: (opts: {
    defaultLabel: string;
    className: string;
  }) => React.ReactNode;
  ellipsisClass?: string;
  itemClasses?: string;
}

const Breadcrumbs = React.forwardRef<HTMLOListElement, BreadcrumbsProps>(
  (
    {
      className,
      children,
      maxItems,
      itemsBeforeCollapse,
      itemsAfterCollapse,
      color,
      size,
      disabled,
      separator = <Icon icon="heroicons:chevron-right" />,
      variant,
      underline,
      modifier,
      onAction,
      renderEllipsis,
      ellipsisClass,
      itemClasses,
      ...props
    },
    ref
  ) => {
    const breadcrumbItems = React.Children.toArray(
      children
    ) as React.ReactElement<BreadcrumbItemProps>[];
    const totalItems = breadcrumbItems.length;

    const beforeCollapse = itemsBeforeCollapse ?? 1;
    const afterCollapse = itemsAfterCollapse ?? 1;
    let visibleItems: (React.ReactElement<BreadcrumbItemProps> | null)[] =
      breadcrumbItems;
    if (maxItems && totalItems > maxItems) {
      const visibleBefore = Math.min(
        beforeCollapse,
        totalItems - afterCollapse
      );
      const visibleAfter = Math.min(afterCollapse, totalItems - visibleBefore);
      visibleItems = [
        ...breadcrumbItems.slice(0, visibleBefore),
        null, // Placeholder for ellipsis
        ...breadcrumbItems.slice(totalItems - visibleAfter),
      ];
    }

    const {
      isLast: _isLast,
      isCurrent: _isCurrent,
      ...olProps
    } = props as typeof props & { isLast?: boolean; isCurrent?: boolean };

    return (
      <ol
        ref={ref}
        className={cn(
          breadcrumbsVariants({
            variant: variant as VariantProps<typeof breadcrumbsVariants>["variant"],
          }),
          className
        )}
        {...olProps}
      >
        {visibleItems.map((child, index) => {
          const isLast = index === visibleItems.length - 1;

          const isCurrent =
            isLast || (child !== null && child.props.isCurrent);
          if (child === null) {
            return (
              <li
                key={`breadcrumb-ellipsis-${index}`}
                className={cn("flex items-center", {
                  "  gap-1 text-base": renderEllipsis,
                })}
              >
                {renderEllipsis ? (
                  <div
                    className={cn(
                      "flex gap-1 text-default-600 items-center ",
                      ellipsisClass
                    )}
                  >
                    {renderEllipsis({
                      defaultLabel: "…",
                      className: ellipsisClass ?? "",
                    })}
                    <span className="separator px-1 self-center">
                      {separator ? (
                        separator
                      ) : (
                        <Icon icon="heroicons:chevron-right" />
                      )}
                    </span>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "flex gap-1 text-default-600  text-base",
                      ellipsisClass
                    )}
                  >
                    <span>
                      <Icon icon="heroicons:ellipsis-horizontal" />
                    </span>
                    <span className="separator px-1 self-center">
                      {separator ? (
                        separator
                      ) : (
                        <Icon icon="heroicons:chevron-right" />
                      )}
                    </span>
                  </div>
                )}
              </li>
            );
          }
          return React.cloneElement(child as React.ReactElement<BreadcrumbItemProps>, {
            ...props,
            isLast,
            isCurrent,
            disabled: disabled && !isLast,
            separator: separator,

            ...child.props,
            className: cn(
              breadcrumbItemsVariants({
                color: color as VariantProps<typeof breadcrumbItemsVariants>["color"],
                size,
                underline: underline as VariantProps<typeof breadcrumbItemsVariants>["underline"],
              }),
              child.props.className,
              itemClasses
            ),
          });
        })}
      </ol>
    );
  }
);

Breadcrumbs.displayName = "Breadcrumbs";

export interface BreadcrumbItemProps
  extends Omit<
      React.HTMLAttributes<HTMLSpanElement>,
      "color" | "children" | "onCopy"
    >,
    VariantProps<typeof breadcrumbItemsVariants> {
  children?: React.ReactNode;
  isLast?: boolean;
  href?: string;
  disabled?: boolean;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  separator?: React.ReactNode;
  isCurrent?: boolean;
  onAction?: (children: React.ReactNode) => void;
  modifier?: string;
}

const BreadcrumbItem = React.forwardRef<HTMLSpanElement, BreadcrumbItemProps>(
  (
    {
      className,
      children,
      color,
      isLast,
      href,
      size,
      disabled,
      underline,
      startContent,
      endContent,
      separator,
      isCurrent,
      onAction,
      modifier,
      ...props
    },
    ref
  ) => {
    const ariaCurrent = isCurrent ? "page" : undefined;
    const dataState = isCurrent ? "active" : undefined;
    const dataDisabled = disabled && !isCurrent ? "true" : undefined;

    const handleClick = () => {
      if (onAction && !isCurrent) {
        onAction(children);
      }
    };

    return (
      <li className="inline-flex items-center">
        <span
          ref={ref}
          className={cn(
            breadcrumbItemsVariants({
              color: color as VariantProps<typeof breadcrumbItemsVariants>["color"],
              size,
              underline: underline as VariantProps<typeof breadcrumbItemsVariants>["underline"],
            }),
            className,
            {
              "cursor-pointer": (!isCurrent && onAction) || !isLast,
              "data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed":
                disabled && !isCurrent,
            }
          )}
          aria-current={ariaCurrent}
          data-state={dataState}
          data-disabled={dataDisabled}
          onClick={handleClick}
          {...props}
        >
          {startContent && <span>{startContent}</span>}
          {href ? <Link href={href}>{children}</Link> : children}
          {endContent && <span>{endContent}</span>}
          {!isLast && separator && (
            <span className="separator px-1 cursor-default">{separator}</span>
          )}
        </span>
      </li>
    );
  }
);

BreadcrumbItem.displayName = "BreadcrumbItem";

export { Breadcrumbs, BreadcrumbItem };
