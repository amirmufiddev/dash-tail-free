"use client";

import { useCallback } from "react";
import {
  VisXYContainer,
  VisGroupedBar,
  VisAxis,
  VisBulletLegend,
} from "@unovis/react";
import { useThemeStore } from "@/store";
import { useTheme } from "next-themes";
import { themes } from "@/config/thems";
import { data } from "./data";
import type { ElectionVoteDatum } from "../datum-types";
import { unovisMillionTick } from "@/lib/unovis-chart";

const BasicGroupedBar = ({ height = 400 }) => {
  const { theme: config, setTheme: setConfig } = useThemeStore();
  const { theme: mode } = useTheme();
  const theme = themes.find((theme) => theme.name === config);

  const colors = {
    republican: `hsl(${
      theme?.cssVars[mode === "dark" ? "dark" : "light"].primary
    })`,
    democrat: `hsl(${theme?.cssVars[mode === "dark" ? "dark" : "light"].info})`,
    other: `hsl(${theme?.cssVars[mode === "dark" ? "dark" : "light"].warning})`,
    libertarian: `hsl(${
      theme?.cssVars[mode === "dark" ? "dark" : "light"].success
    })`,
  };
  const legendItems = Object.entries(colors).map(([n, c]) => ({
    name: n.toUpperCase(),
    color: c,
  }));
  return (
    <>
      <VisBulletLegend items={legendItems} />
      <VisXYContainer<ElectionVoteDatum> height={height} data={data}>
        <VisGroupedBar
          x={useCallback((d: ElectionVoteDatum) => d.year, [])}
          y={[
            useCallback((d: ElectionVoteDatum) => d.republican, []),
            useCallback((d: ElectionVoteDatum) => d.democrat, []),
            useCallback((d: ElectionVoteDatum) => d.other, []),
            useCallback((d: ElectionVoteDatum) => d.libertarian, []),
          ]}
          color={useCallback((_: ElectionVoteDatum, i: number) => legendItems[i].color, [legendItems])}
        />
        <VisAxis
          type="x"
          label="Election Year"
          numTicks={data.length}
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
          type="y"
          tickFormat={useCallback(unovisMillionTick, [])}
          label="Number of Votes (millions)"
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
      </VisXYContainer>
    </>
  );
};

export default BasicGroupedBar;
