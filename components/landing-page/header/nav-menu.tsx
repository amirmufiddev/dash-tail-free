import React from "react";
import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { menus } from "./../data";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
export default function NavMenu() {
  const [offset, setOffset] = React.useState<number | null>(null);
  const [list, setList] = React.useState<HTMLUListElement | null>(null);
  const [value, setValue] = React.useState("");

  const onNodeUpdate = (
    trigger: HTMLButtonElement | null,
    itemValue: string
  ) => {
    if (trigger && list && value === itemValue) {
      const triggerOffsetLeft = trigger.offsetLeft + trigger.offsetWidth / 6;

      setOffset(Math.round(triggerOffsetLeft));
    } else if (value === "") {
      setOffset(null);
    }
  };

  return (
    <div>
      <NavigationMenu.Root
        onValueChange={setValue}
        className="  relative  justify-start group z-[9999] "
      >
        <NavigationMenu.List
          ref={(node) => setList(node)}
          className="group flex list-none gap-8"
        >
          {menus?.map((item, index) =>
            item.child ? (
              <NavigationMenu.Item key={`item-${index}`} value={item.title}>
                <NavigationMenu.Trigger
                  ref={(node) => onNodeUpdate(node, item.title)}
                  asChild
                  className=" flex items-center"
                >
                  <div className=" flex items-center  py-4 cursor-pointer group data-[state=open]:text-primary">
                    <span className="text-base font-medium text-default-600">
                      {item.title}
                    </span>
                    <ChevronDown
                      className="relative top-[1px] ml-1 h-4 w-4 transition duration-200 group-data-[state=open]:rotate-180"
                      aria-hidden="true"
                    />
                  </div>
                </NavigationMenu.Trigger>
                <NavigationMenu.Content
                  className={cn(
                    "w-full  rounded-md border bg-popover text-popover-foreground shadow-lg   "
                  )}
                >
                  {item.child && (
                    <div className=" min-w-[200px] p-4" key={`item-${index}`}>
                      {item.child?.map((childItem, index) => (
                        <ListItem
                          className="text-base font-medium text-default-600 "
                          key={`child-${index}`}
                          title={childItem.title}
                          href={childItem.href}
                          childItem={childItem}
                          target="_blank"
                        ></ListItem>
                      ))}
                    </div>
                  )}
                </NavigationMenu.Content>
              </NavigationMenu.Item>
            ) : (
              <NavigationMenu.Item key={`item-${index}`}>
                <NavigationMenu.Link href={item.href}>
                    <div className=" flex items-center px-2 py-4 cursor-pointer group  data-[state=open]:text-primary">
                      <span className="text-base font-medium text-default-600 hover:text-primary">
                      {item.title}
                    </span>
                  </div>
                </NavigationMenu.Link>
              </NavigationMenu.Item>
            )
          )}
        </NavigationMenu.List>

        <div className=" absolute  top-full ">
          <NavigationMenu.Viewport
            style={{
              display: !offset ? "none" : undefined,
              transform: `translateX(${offset}px)`,
              top: "100%",
              transition: "all 0.5s ease",
            }}
          />
        </div>
      </NavigationMenu.Root>
    </div>
  );
}

const ListItem = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<typeof Link> & {
    title?: string;
    childItem?: { title?: string; href?: string; icon?: React.ElementType };
  }
>(({ className, children, title, childItem, ...props }, forwardedRef) => (
    <NavigationMenu.Link asChild>
      <Link
        className={cn(
          " select-none   text-base  font-medium text-default-600 rounded-md flex  items-center gap-2 mb-4 last:mb-0  leading-none no-underline outline-none transition-colors  hover:text-primary  focus:text-primary",
          className
        )}
        {...props}
        ref={forwardedRef}
      >
        <div>{children}</div>
        <div className=" capitalize">{title}</div>
      </Link>
    </NavigationMenu.Link>
  )
);
