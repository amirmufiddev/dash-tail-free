"use client";

import { useCallback, useMemo, useState } from "react";
import {
  VisXYContainer,
  VisAxis,
  VisBrush,
  VisGroupedBar,
  VisBulletLegend,
} from "@unovis/react";
import { brushChartData, groups } from "./data";
import type { BrushChartDatum, BrushGroupMeta } from "../datum-types";
import type { BulletLegendItemInterface } from "@unovis/ts";
import { useThemeStore } from "@/store";
import { useTheme } from "next-themes";
import { themes } from "@/config/thems";

type LegendItem = BrushGroupMeta & { inactive: boolean };

const legendItems: LegendItem[] = groups.map((g) => ({ ...g, inactive: false }));

const BrushGroupedBar = () => {
  const { theme: config, setTheme: setConfig } = useThemeStore();
  const { theme: mode } = useTheme();
  const theme = themes.find((theme) => theme.name === config);

  const [domain, setDomain] = useState<[number, number]>([1980, 1990]);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [items, setItems] = useState<LegendItem[]>(legendItems);

  const x = useCallback((d: BrushChartDatum) => d.year, []);

  const y = useMemo(
    () =>
      items.map((i) => (d: BrushChartDatum) =>
        i.inactive ? null : (d[i.key] ?? null)
      ),
    [items]
  );

  const updateDomain = useCallback(
    (
      selection: [number, number] | undefined,
      _event: unknown,
      userDriven: boolean
    ) => {
      if (userDriven && selection) {
        setDuration(0);
        setDomain(selection);
      }
    },
    []
  );

  const updateItems = useCallback(
    (_item: BulletLegendItemInterface, i: number) => {
      const newItems = [...items];
      const current = newItems[i];
      if (!current) return;
      newItems[i] = { ...current, inactive: !current.inactive };
      setDuration(undefined);
      setItems(newItems);
    },
    [items]
  );

  const brushChartMargin = useMemo(() => ({ left: 60 }), []);
  return (
    <>
      <VisBulletLegend items={items} onLegendItemClick={updateItems} />
      <VisXYContainer<BrushChartDatum>
        duration={duration}
        data={brushChartData}
        height={"50vh"}
        xDomain={domain}
        scaleByDomain={true}
      >
        <VisGroupedBar
          x={x}
          y={y}
          groupPadding={0.2}
          roundedCorners
          barMinHeight={0}
        />
        <VisAxis
          type="x"
          label="Year"
          numTicks={Math.min(15, domain[1] - domain[0])}
          gridLine={false}
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
          label="Cereal Production (metric tons, millions)"
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
      <VisXYContainer<BrushChartDatum>
        data={brushChartData}
        height={75}
        margin={brushChartMargin}
      >
        <VisGroupedBar x={x} y={y} />
        <VisBrush selection={domain} onBrush={updateDomain} draggable={true} />
        <VisAxis
          type="x"
          numTicks={15}
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

export default BrushGroupedBar;
