import type { StaticImageData } from "next/image";

export type ProjectAssignee = {
  image?: StaticImageData | { src?: string };
  label?: string;
  value?: string;
};

export type ProjectRow = {
  id: number | string;
  title: string;
  subtitle?: string;
  status?: string;
  label?: string;
  priority?: string;
  description?: string;
  percentage?: number;
  assign?: ProjectAssignee[];
  assignDate?: string;
  dueDate?: string;
  isFavorite?: boolean;
  logo?: StaticImageData | { src?: string };
};