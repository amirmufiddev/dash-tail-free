"use client";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from "chart.js";
import { hslToHex, hexToRGB } from "@/lib/utils";
import { useThemeStore } from "@/store";
import { useTheme } from "next-themes";
import { themes } from "@/config/thems";
import type { ChartData, ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement
);

const ProgressiveLine = ({ height = 350 }) => {
  const { theme: config, setTheme: setConfig } = useThemeStore();
  const { theme: mode } = useTheme();

  const theme = themes.find((theme) => theme.name === config);

  const hslDestructive = `hsla(${
    theme?.cssVars[mode === "dark" ? "dark" : "light"].destructive
  })`;
  const hslInfo = `hsla(${
    theme?.cssVars[mode === "dark" ? "dark" : "light"].info
  })`;

  const hexDestructive = hslToHex(hslDestructive);
  const hexInfo = hslToHex(hslInfo);

  const labels = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
  ];

  var data = [];
  let data2 = [];
  let prev = 100;
  let prev2 = 80;
  for (let i = 0; i < 1000; i++) {
    prev += 5 - Math.random() * 10;
    data.push({ x: i, y: prev });
    prev2 += 5 - Math.random() * 10;
    data2.push({ x: i, y: prev2 });
  }

  const totalDuration = 10000;
  const delayBetweenPoints = totalDuration / data.length;
  const previousY = (ctx: {
    index: number;
    datasetIndex: number;
    chart: {
      scales: { y: { getPixelForValue: (value: number) => number } };
      getDatasetMeta: (index: number) => {
        data: { getProps: (props: string[], final: boolean) => { y: number } }[];
      };
    };
  }) =>
    ctx.index === 0
      ? ctx.chart.scales.y.getPixelForValue(100)
      : ctx.chart
          .getDatasetMeta(ctx.datasetIndex)
          .data[ctx.index - 1]?.getProps(["y"], true).y;
  const animation = {
    x: {
      type: "number",
      easing: "linear",
      duration: delayBetweenPoints,
      from: NaN, // the point is initially skipped
      delay(ctx: { type: string; xStarted: unknown; index: number }) {
        if (ctx.type !== "data" || ctx.xStarted) {
          return 0;
        }
        ctx.xStarted = true;
        return ctx.index * delayBetweenPoints;
      },
    },
    y: {
      type: "number",
      easing: "linear",
      duration: delayBetweenPoints,
      from: previousY,
      delay(ctx: { type: string; yStarted: unknown; index: number }) {
        if (ctx.type !== "data" || ctx.yStarted) {
          return 0;
        }
        ctx.yStarted = true;
        return ctx.index * delayBetweenPoints;
      },
    },
  };

  let data1 = {
    labels: labels,
    datasets: [
      {
        label: "Dataset 1",
        data: data,
        borderColor: hexToRGB(hexDestructive, 0.5),
        borderWidth: 1,
        radius: 0,
      },
      {
        label: "Dataset 2",
        data: data2,
        borderColor: hexToRGB(hexInfo, 0.5),
        borderWidth: 1,
        radius: 0,
      },
    ],
  } as unknown as ChartData<"line">;

  const options = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: `hsl(${
            theme?.cssVars[
              mode === "dark" || mode === "system" ? "dark" : "light"
            ].chartLabel
          })`,
        },
        display: true,
      },
    },
    animation,
    interaction: {
      intersect: false,
    },
    hover: {
      mode: "index",
      intersect: false,
    },
    scales: {
      y: {
        stacked: true,
        grid: {
          drawTicks: false,
          color: `hsl(${
            theme?.cssVars[
              mode === "dark" || mode === "system" ? "dark" : "light"
            ].chartGird
          })`,
        },
        ticks: {
          color: `hsl(${
            theme?.cssVars[
              mode === "dark" || mode === "system" ? "dark" : "light"
            ].chartLabel
          })`,
        },
      },
      x: {
        type: "linear",
        stacked: true,
        title: {
          color: `hsl(${
            theme?.cssVars[
              mode === "dark" || mode === "system" ? "dark" : "light"
            ].chartLabel
          })`,
          display: true,
        },
        grid: {
          drawTicks: false,
          color: `hsl(${
            theme?.cssVars[
              mode === "dark" || mode === "system" ? "dark" : "light"
            ].chartGird
          })`,
        },

        ticks: {
          color: `hsl(${
            theme?.cssVars[
              mode === "dark" || mode === "system" ? "dark" : "light"
            ].chartLabel
          })`,
        },
      },
    },

    maintainAspectRatio: false,
  } as unknown as ChartOptions<"line">;
  return (
    <div>
      <Line options={options} data={data1} height={height} />
    </div>
  );
};

export default ProgressiveLine;
