"use client";
import { useThemeStore } from "@/store";
import { useTheme } from "next-themes";
import { themes } from "@/config/thems";
import {
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  Tooltip,
  LabelList,
} from "recharts";
import { data } from "./data";
import CustomTooltip from "./custom-tooltip";
import type { LabelProps } from "recharts";

const renderCustomizedLabel = ({ x, y, width, value }: LabelProps) => {
  const originX = typeof x === "number" ? x : Number(x ?? 0);
  const originY = typeof y === "number" ? y : Number(y ?? 0);
  const barWidth = typeof width === "number" ? width : Number(width ?? 0);
  const label = typeof value === "string" ? value : String(value ?? "");
  const radius = 10;

  return (
    <g>
      <circle cx={originX + barWidth / 2} cy={originY - radius} r={radius} fill="#8884d8" />
      <text
        x={originX + barWidth / 2}
        y={originY - radius}
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {label.split(" ")[1]}
      </text>
    </g>
  );
};

const BarWithMinHeight = ({ height = 300 }) => {
  const { theme: config, setTheme: setConfig } = useThemeStore();
  const { theme: mode } = useTheme();
  const theme = themes.find((theme) => theme.name === config);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart height={height} data={data}>
        <CartesianGrid
          stroke={`hsl(${
            theme?.cssVars[mode === "dark" ? "dark" : "light"].chartGird
          })`}
          strokeDasharray="3 3"
          vertical={false}
        />

        <XAxis
          dataKey="name"
          tick={{
            fill: `hsl(${
              theme?.cssVars[mode === "dark" ? "dark" : "light"].chartLabel
            })`,
            fontSize: "12px",
          }}
          tickLine={false}
          stroke={`hsl(${
            theme?.cssVars[mode === "dark" ? "dark" : "light"].chartGird
          })`}
          axisLine={false}
        />
        <YAxis
          tick={{
            fill: `hsl(${
              theme?.cssVars[mode === "dark" ? "dark" : "light"].chartLabel
            })`,
            fontSize: "12px",
          }}
          tickLine={false}
          stroke={`hsl(${
            theme?.cssVars[mode === "dark" ? "dark" : "light"].chartGird
          })`}
        />
        <Tooltip content={<CustomTooltip />} />

        <Bar
          dataKey="pv"
          fill={`hsl(${
            theme?.cssVars[mode === "dark" ? "dark" : "light"].primary
          })`}
          minPointSize={5}
        >
          <LabelList dataKey="name" content={renderCustomizedLabel} />
        </Bar>
        <Bar
          dataKey="uv"
          fill={`hsl(${
            theme?.cssVars[mode === "dark" ? "dark" : "light"].info
          })`}
          minPointSize={10}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default BarWithMinHeight;
