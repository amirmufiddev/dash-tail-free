"use client";
import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { useThemeStore } from "@/store";
import { useTheme } from "next-themes";
import { themes } from "@/config/thems";

const themeColors = {
    primary: "#3B82F6",
    success: "#22C55E",
    warning: "#F97316",
    destructive: "#EF4444",
} as const;

type SparkColor = keyof typeof themeColors;

const AreaChart = ({
  series,
  color,
}: {
  series: { data: number[] }[];
  color: string;
}) => {
  const { theme: config, setTheme: setConfig } = useThemeStore();
  const { theme: mode } = useTheme();
  const theme = themes.find((theme) => theme.name === config);
  const themeColor =
    color === "success" || color === "warning" || color === "destructive"
      ? themeColors[color]
      : themeColors.primary;
  const options = {
    chart: {
      toolbar: {
        autoSelected: "pan",
        show: false,
      },
      offsetX: 0,
      offsetY: 0,
      zoom: {
        enabled: false,
      },
      sparkline: {
        enabled: true,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    colors: [
      themeColor,
    ],
    tooltip: {
      theme: "light",
    },
    fill: {
      type: "solid",
      opacity: 0.1
    },
    grid: {
      show: false,
      padding: {
        left: 0,
        right: 0,
      },
    },
    yaxis: {
      show: false,
    },
    legend: {
      show: false,
    },
    xaxis: {
      low: 0,
      offsetX: 0,
      offsetY: 0,
      show: false,
      labels: {
        low: 0,
        offsetX: 0,
        show: false,
      },
      axisBorder: {
        low: 0,
        offsetX: 0,
        show: false,
      },
    },
  } as unknown as ApexOptions
  return (
    <>
      <Chart
        options={options}
        series={series}
        type="area"
        height={40}
        width={74}
      />
    </>
  );
};

export default AreaChart;
