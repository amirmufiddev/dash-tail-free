"use client";
import React from "react";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import MultiMenuHandler from "./multi-menu-handler";
import MultiNestedMenu from "./multi-nested-menu";
import SubMenuItem from "./sub-menu-item";
import { usePathname } from "next/navigation";
import { isLocationMatch, cn } from "@/lib/utils";
import type { SidebarMenuItem } from "../types";

const NestedSubMenu = ({
  activeSubmenu,
  item,
  index,
  activeMultiMenu,
  toggleMultiMenu,
  collapsed: _collapsed,
  hovered: _hovered,
}: {
  activeSubmenu: number | null;
  item: SidebarMenuItem;
  index: number;
  activeMultiMenu: number | null;
  toggleMultiMenu: (subIndex: number) => void;
  collapsed?: boolean;
  hovered?: boolean;
}) => {
  const locationName = usePathname();
  return (
    <Collapsible open={activeSubmenu === index}>
      <CollapsibleContent className="CollapsibleContent">
        <ul className="sub-menu  space-y-4 relative before:absolute before:left-4 before:top-0  before:h-[calc(100%-5px)]  before:w-[3px] before:bg-primary/10 before:rounded">
          {item.child?.map((subItem, j) => (
            <li
              className={cn(
                "block pl-9   first:pt-4 last:pb-4  relative before:absolute first:before:top-4 before:top-0 before:left-4  before:w-[3px]",
                {
                  "before:bg-primary first:before:h-[calc(100%-16px)]  before:h-full":
                    isLocationMatch(subItem.href, locationName),
                  kk: activeSubmenu === index,
                }
              )}
              key={`sub_menu_${j}`}
            >
              {subItem?.multi_menu ? (
                <div>
                  <MultiMenuHandler
                    subItem={subItem}
                    subIndex={j}
                    activeMultiMenu={activeMultiMenu}
                    toggleMultiMenu={toggleMultiMenu}
                  />
                  <MultiNestedMenu
                    subItem={subItem}
                    subIndex={j}
                    activeMultiMenu={activeMultiMenu}
                  />
                </div>
              ) : (
                subItem.href && (
                  <SubMenuItem subItem={subItem} subIndex={j} />
                )
              )}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default NestedSubMenu;