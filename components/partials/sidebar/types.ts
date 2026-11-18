import type { ComponentType, ReactNode } from "react";

export type SidebarIcon = ComponentType<{ className?: string }>;

export type SidebarMultiMenuItem = {
  title: ReactNode;
  href: string;
  icon?: string | SidebarIcon;
};

export type SidebarNestedMenuItem = {
  title: ReactNode;
  href?: string;
  icon?: SidebarIcon;
  child?: SidebarMultiMenuItem[];
  nested?: SidebarNestedMenuItem[];
};

export type SidebarChildMenuItem = {
  title: ReactNode;
  icon?: SidebarIcon;
  href?: string;
  nested?: SidebarNestedMenuItem[];
  multi_menu?: SidebarMultiMenuItem[];
  badge?: ReactNode;
};

export type SidebarMenuItem = {
  title: ReactNode;
  icon?: SidebarIcon;
  href?: string;
  child?: SidebarChildMenuItem[];
  nested?: SidebarNestedMenuItem[];
  isHeader?: boolean;
  badge?: ReactNode;
  isOpen?: boolean;
  isHide?: boolean;
};