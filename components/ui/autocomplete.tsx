"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type AutocompleteContextValue = {
  value: string
  select: (value: string) => void
}

const AutocompleteContext =
  React.createContext<AutocompleteContextValue | null>(null)

export interface AutocompleteProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  labelClass?: string
  children?: React.ReactNode
  placeholder?: string
}

const Autocomplete = React.forwardRef<HTMLDivElement, AutocompleteProps>(
  (
    {
      label,
      className,
      children,
      labelClass,
      placeholder = "Select item...",
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)
    const [value, setValue] = React.useState("")

    const items = React.useMemo(() => {
      const found: { value: string; label: React.ReactNode }[] = []
      React.Children.forEach(children, (child) => {
        if (!React.isValidElement<AutocompleteItemProps>(child)) return
        found.push({ value: child.props.value, label: child.props.children })
      })
      return found
    }, [children])

    const selected = items.find((item) => item.value === value)

    const select = React.useCallback((next: string) => {
      setValue((current) => (current === next ? "" : next))
      setOpen(false)
    }, [])

    const contextValue = React.useMemo(
      () => ({ value, select }),
      [value, select]
    )

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn("w-full justify-between font-normal", labelClass)}
            >
              <span className="truncate">{selected?.label ?? placeholder}</span>
              <ChevronsUpDown className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[12rem] p-0">
            <AutocompleteContext.Provider value={contextValue}>
              <Command>
                <CommandInput
                  placeholder={`Search ${label.toLowerCase()}...`}
                  className="h-9"
                />
                <CommandList>
                  <CommandEmpty>No item found.</CommandEmpty>
                  <CommandGroup>{children}</CommandGroup>
                </CommandList>
              </Command>
            </AutocompleteContext.Provider>
          </PopoverContent>
        </Popover>
      </div>
    )
  }
)
Autocomplete.displayName = "Autocomplete"

export interface AutocompleteItemProps
  extends Omit<React.ComponentPropsWithoutRef<typeof CommandItem>, "onSelect" | "value"> {
  value: string
}

const AutocompleteItem = React.forwardRef<
  React.ElementRef<typeof CommandItem>,
  AutocompleteItemProps
>(({ children, value, className, ...props }, ref) => {
  const ctx = React.useContext(AutocompleteContext)

  return (
    <CommandItem
      ref={ref}
      value={value}
      className={className}
      onSelect={() => ctx?.select(value)}
      {...props}
    >
      {children}
      <Check
        className={cn(
          "ml-auto",
          ctx?.value === value ? "opacity-100" : "opacity-0"
        )}
      />
    </CommandItem>
  )
})
AutocompleteItem.displayName = "AutocompleteItem"

export { Autocomplete, AutocompleteItem }
