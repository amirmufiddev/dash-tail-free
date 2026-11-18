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
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface AutocompleteProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  labelClass?: string;
  children?: React.ReactNode;
}

const Autocomplete = React.forwardRef<HTMLDivElement, AutocompleteProps>(
  ({ label, className, children, labelClass, ...props }, ref) => {
    const [open, setOpen] = React.useState(false);
    const [value, setValue] = React.useState("");
    const [selectedLabel, setSelectedLabel] =
      React.useState<React.ReactNode>("Select item...");

    const handleSelect = (newValue: string, newLabel: React.ReactNode) => {
      setValue(newValue);
      setSelectedLabel(newLabel);
      setOpen(false);
    };

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn(" w-full justify-between", labelClass)}
          >
            {selectedLabel}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[500px]" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandEmpty>No item found.</CommandEmpty>
            <CommandGroup>
              {React.Children.map(children, (child) => {
                if (!React.isValidElement<AutocompleteItemProps>(child)) {
                  return child;
                }
                const itemProps: Partial<AutocompleteItemProps> = {
                  onSelect: handleSelect,
                  isSelected: child.props.value === value,
                };
                return React.cloneElement(child, itemProps);
              })}
            </CommandGroup>
          </Command>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    );
  }
);
Autocomplete.displayName = "Autocomplete";

export interface AutocompleteItemProps
  extends Omit<React.ComponentPropsWithoutRef<typeof CommandItem>, "onSelect"> {
  value: string;
  onSelect?: (value: string, label: React.ReactNode) => void;
  isSelected?: boolean;
}

const AutocompleteItem = React.forwardRef<
  React.ElementRef<typeof CommandItem>,
  AutocompleteItemProps
>(({ children, value, onSelect, isSelected, ...props }, ref) => {
    const handleItemClick = () => {
      onSelect?.(value, children);
    };

    return (
      <CommandItem onSelect={handleItemClick} ref={ref} {...props}>
        {children}
        <Check
          className={cn(
            "mr-2 h-4 w-4 ml-auto",
            isSelected ? "opacity-100" : "opacity-0"
          )}
        />

      </CommandItem>
    );
  }
);
AutocompleteItem.displayName = "AutocompleteItem";
export { Autocomplete, AutocompleteItem };
