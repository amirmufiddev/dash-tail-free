"use client";
import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
} from "chart.js";

import { useThemeStore } from "@/store";
import { useTheme } from "next-themes";
import { themes } from "@/config/thems";
import type { Chart, ChartData, ChartOptions, TooltipModel } from "chart.js";

const externalTooltipHandler = (context: {
  chart: Chart;
  tooltip: TooltipModel<"line">;
}) => {
  const { chart, tooltip } = context;
  const parent = chart.canvas.parentNode;
  if (!(parent instanceof HTMLElement)) {
    return;
  }
  let tooltipEl = parent.querySelector<HTMLDivElement>("div.chartjs-tooltip");
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "chartjs-tooltip";
    tooltipEl.style.pointerEvents = "none";
    tooltipEl.style.position = "absolute";
    tooltipEl.style.transform = "translate(-50%, -100%)";
    parent.appendChild(tooltipEl);
  }
  if (tooltip.opacity === 0) {
    tooltipEl.style.opacity = "0";
    return;
  }
  tooltipEl.style.opacity = "1";
  tooltipEl.innerHTML = tooltip.body.map((body) => body.lines.join("<br>")).join("");
  tooltipEl.style.left = `${tooltip.caretX}px`;
  tooltipEl.style.top = `${tooltip.caretY}px`;
};
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement
);

const ExternalHTMLTooltip = ({ height = 350 }) => {
  const { theme: config, setTheme: setConfig } = useThemeStore();
  const { theme: mode } = useTheme();
  const theme = themes.find((theme) => theme.name === config);
  const hslWarning = `hsla(${
    theme?.cssVars[mode === "dark" ? "dark" : "light"].warning
  })`;
  const hslInfo = `hsla(${
    theme?.cssVars[mode === "dark" ? "dark" : "light"].info
  })`;
  const data = {
    labels: ["January", "February", "March", "April", "May", "Jun", "July"],
    datasets: [
      {
        label: "Dataset 1",
        data: [20, 50, 60, 70, 20, 30, 20],
        borderColor: hslWarning,
        fill: false,
      },
      {
        label: "Dataset 2",
        data: [40, 70, 80, 90, 40, 50, 40],
        borderColor: hslInfo,
        fill: false,
      },
    ],
  } as unknown as ChartData<"line">;
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: `hsl(${
            theme?.cssVars[
              mode === "dark" || mode === "system" ? "dark" : "light"
            ].chartLabel
          })`,
        },
      },
      tooltip: {
        enabled: false,
        position: "nearest",
        external: externalTooltipHandler,
      },
    },
    scales: {
      y: {
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
      <Line options={options} data={data} height={height} />
    </div>
  );
};

export default ExternalHTMLTooltip;
