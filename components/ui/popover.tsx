"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  onWheel,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        onWheel={(e) => {
          e.stopPropagation()
          onWheel?.(e)
        }}
        className={cn(
          "z-[10050] pointer-events-auto w-72 origin-[--radix-popover-content-transform-origin] rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

const PopoverClose = PopoverPrimitive.Close
const PopoverArrow = PopoverPrimitive.Arrow

function CustomPopover({
  children,
  open = false,
  onClose,
  className,
  trigger,
}: {
  children?: React.ReactNode
  open?: boolean
  onClose?: () => void
  className?: string
  trigger?: React.ReactNode
}) {
  const popoverRef = React.useRef<HTMLDivElement>(null)

  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element)) return
    if (
      popoverRef.current &&
      !popoverRef.current.contains(target) &&
      !target.closest(".custom-popover-container")
    ) {
      onClose?.()
    }
  }

  React.useEffect(() => {
    document.addEventListener("click", handleClickOutside)
    return () => {
      document.removeEventListener("click", handleClickOutside)
    }
  }, [onClose])

  return (
    <div className="relative" ref={popoverRef}>
      {trigger}
      {open && (
        <div
          className={cn(
            "custom-popover-container absolute left-0 z-[999] w-56 rounded-md border border-default-200 bg-popover shadow-lg focus:outline-none",
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
  PopoverClose,
  PopoverArrow,
  CustomPopover,
}
