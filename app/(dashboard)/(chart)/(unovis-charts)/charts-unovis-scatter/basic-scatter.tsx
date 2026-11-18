"use client";
import { useCallback } from "react";
import { Position, Scale, Scatter } from "@unovis/ts";
import {
  VisAxis,
  VisBulletLegend,
  VisScatter,
  VisTooltip,
  VisXYContainer,
} from "@unovis/react";
import { data, palette } from "./data";
import type { ScatterJobDatum } from "../datum-types";
import { unovisTickFormat } from "@/lib/unovis-chart";

const categories = Array.from(new Set(data.map((d) => d.category))).sort();
const colorScale = Scale.scaleOrdinal(palette).domain(categories);
const formatNumber = unovisTickFormat((value) =>
  Intl.NumberFormat("en", { notation: "compact" }).format(value)
);

import { useThemeStore } from "@/store";
import { useTheme } from "next-themes";
import { themes } from "@/config/thems";

const BasicScatterChart = () => {
  const { theme: config, setTheme: setConfig } = useThemeStore();
  const { theme: mode } = useTheme();
  const theme = themes.find((theme) => theme.name === config);

  const legendItems = categories.map((v) => ({
    name: v,
    color: colorScale(v),
  }));
  const tooltipTriggers = {
    [Scatter.selectors.point]: (d: ScatterJobDatum) => `
      ${d.major}<br/>Number of graduates: ${d.total.toLocaleString()}
    `,
  };

  return (
    <>
      <h2>American College Graduates, 2010-2012</h2>
      <VisBulletLegend items={legendItems} />
      <VisXYContainer<ScatterJobDatum>
        data={data}
        height={"60vh"}
        scaleByDomain={true}
      >
        <VisScatter
          x={useCallback((d: ScatterJobDatum) => d.medianSalary, [])}
          y={useCallback((d: ScatterJobDatum) => d.employmentRate, [])}
          color={useCallback((d: ScatterJobDatum) => colorScale(d.category), [])}
          size={useCallback((d: ScatterJobDatum) => d.total, [])}
          label={useCallback(
            (d: ScatterJobDatum) =>
              Intl.NumberFormat("en", { notation: "compact" }).format(d.total),
            []
          )}
          labelPosition={Position.Bottom}
          sizeRange={[10, 50]}
          cursor="pointer"
        />
        <VisAxis
          type="x"
          label="Median Salary ($)"
          tickFormat={formatNumber}
          tickTextColor={`hsl(${
            theme?.cssVars[
              mode === "dark" || mode === "system" ? "dark" : "light"
            ].chartLabel
          })`}
          labelColor={`hsl(${
            theme?.cssVars[
              mode === "dark" || mode === "system" ? "dark" : "light"
            ].chartLabel
          })`}
        />
        <VisAxis
          excludeFromDomainCalculation
          type="y"
          label="Employment Rate"
          tickPadding={0}
          tickTextColor={`hsl(${
            theme?.cssVars[
              mode === "dark" || mode === "system" ? "dark" : "light"
            ].chartLabel
          })`}
          labelColor={`hsl(${
            theme?.cssVars[
              mode === "dark" || mode === "system" ? "dark" : "light"
            ].chartLabel
          })`}
        />
        <VisTooltip triggers={tooltipTriggers} />
      </VisXYContainer>
    </>
  );
};

export default BasicScatterChart;
