import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type AutocompleteContextValue = {
  value: string;
  select: (value: string, label: React.ReactNode) => void;
};

const AutocompleteContext =
  React.createContext<AutocompleteContextValue | null>(null);

export interface AutocompleteProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  labelClass?: string;
  children?: React.ReactNode;
  placeholder?: string;
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
    const [open, setOpen] = React.useState(false);
    const [value, setValue] = React.useState("");
    const [selectedLabel, setSelectedLabel] =
      React.useState<React.ReactNode>(placeholder);

    const select = React.useCallback(
      (newValue: string, newLabel: React.ReactNode) => {
        setValue(newValue);
        setSelectedLabel(newLabel);
        setOpen(false);
      },
      []
    );

    const contextValue = React.useMemo(
      () => ({ value, select }),
      [value, select]
    );

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        <Popover open={open} onOpenChange={setOpen} modal={false}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn("w-full justify-between font-normal", labelClass)}
            >
              <span className="truncate">{selectedLabel}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] min-w-[12rem] p-0"
            align="start"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <AutocompleteContext.Provider value={contextValue}>
              <Command>
                <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
                <CommandList>
                  <CommandEmpty>No item found.</CommandEmpty>
                  <CommandGroup>{children}</CommandGroup>
                </CommandList>
              </Command>
            </AutocompleteContext.Provider>
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);
Autocomplete.displayName = "Autocomplete";

export interface AutocompleteItemProps
  extends Omit<React.ComponentPropsWithoutRef<typeof CommandItem>, "onSelect"> {
  value: string;
}

function autocompleteCmdkValue(
  value: string,
  children: React.ReactNode
): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  return value;
}

const AutocompleteItem = React.forwardRef<
  React.ElementRef<typeof CommandItem>,
  AutocompleteItemProps
>(({ children, value, className, ...props }, ref) => {
  const ctx = React.useContext(AutocompleteContext);
  const cmdkValue = autocompleteCmdkValue(value, children);
  const isSelected = ctx?.value === value;

  return (
    <CommandItem
      ref={ref}
      value={cmdkValue}
      className={cn("cursor-pointer", className)}
      {...props}
      onSelect={() => ctx?.select(value, children)}
    >
      <Check
        className={cn(
          "mr-2 h-4 w-4",
          isSelected ? "opacity-100" : "opacity-0"
        )}
      />
      {children}
    </CommandItem>
  );
});
AutocompleteItem.displayName = "AutocompleteItem";

export { Autocomplete, AutocompleteItem };