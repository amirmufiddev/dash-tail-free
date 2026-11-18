"use client";

import { useCallback, useMemo } from "react";
import {
  VisArea,
  VisAxis,
  VisBulletLegend,
  VisXYContainer,
} from "@unovis/react";
import { CurveType } from "@unovis/ts";
import { categories, baselineData } from "./data";
import type { BaselineAreaDatum, BaselineCategory } from "../datum-types";
import { unovisTickFormat } from "@/lib/unovis-chart";
import { useTheme } from "next-themes";
import { useThemeStore } from "@/store";
import { themes } from "@/config/thems";

const BaselineAreaChart = ({ height = 400 }) => {
  const { theme: config, setTheme: setConfig } = useThemeStore();
  const { theme: mode } = useTheme();
  const theme = themes.find((theme) => theme.name === config);

  const sums = baselineData.map((d) => d.art.reduce((t, i) => t + i, 0));
  const max = Math.max(...sums);

  const yTicks = Array(Math.round(max / 1000))
    .fill(0)
    .map((_, i) => {
      const dir = i % 2 === 1 ? -(i - 1) : i;
      return max / 2 + dir * 1000;
    });

  const x = useCallback((d: BaselineAreaDatum) => d.year, []);
  const y = useCallback(
    (c: BaselineCategory) => (d: BaselineAreaDatum) => d.art[c.id] ?? 0,
    []
  );
  const baseline = useCallback((_: BaselineAreaDatum, i: number) => (max - sums[i]) / 2, [max, sums]);

  const categoryList = categories as BaselineCategory[];

  return (
    <div>
      <VisBulletLegend items={categoryList} />
      <VisXYContainer<BaselineAreaDatum> data={baselineData} height={height}>
        <VisArea
          x={x}
          y={useMemo(() => categoryList.map(y), [y, categoryList])}
          baseline={baseline}
          curveType={CurveType.Basis}
        />
        <VisAxis
          type="x"
          label="Year"
          tickTextColor={`hsl(${
            theme?.cssVars[
              mode === "dark" || mode === "system" ? "dark" : "light"
            ].chartLabel
          })`}
        />
        <VisAxis
          type="y"
          label="Number of Works Acquired"
          tickValues={yTicks}
          tickFormat={useCallback(
            unovisTickFormat((i) => `${Math.abs(i - max / 2)}`),
            [max]
          )}
          tickTextColor={`hsl(${
            theme?.cssVars[
              mode === "dark" || mode === "system" ? "dark" : "light"
            ].chartLabel
          })`}
        />
      </VisXYContainer>
    </div>
  );
};

export default BaselineAreaChart;