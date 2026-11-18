"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import {
  VisXYContainer,
  VisLine,
  VisAxis,
  VisXYLabels,
  VisBulletLegend,
} from "@unovis/react";
import type { BulletLegendItemInterface } from "@unovis/ts";
import { countries, countriesData, legendItems } from "./data";
import type { CountryGdpDatum } from "../datum-types";
import { useThemeStore } from "@/store";
import { useTheme } from "next-themes";
import { themes } from "@/config/thems";

type CountryMeta = (typeof countries)[number];

type FallbackLegendItem = {
  name: string;
  inactive?: boolean;
  color: string;
};

const DataGapsLine = ({ height = 400 }) => {
  const [current, setCurrent] = useState(0);
  const [fallbackValue, setFallbackValue] = useState<number | undefined>();
  const [items, setLegendItems] = useState<FallbackLegendItem[]>([]);

  const { theme: config, setTheme: setConfig } = useThemeStore();
  const { theme: mode } = useTheme();
  const theme = themes.find((theme) => theme.name === config);

  const getY = useCallback(
    (c: CountryMeta) => (d: CountryGdpDatum) => {
      const value = d[c.id as keyof CountryGdpDatum];
      return typeof value === "number" ? value : null;
    },
    []
  );

  useEffect(() => {
    const option = legendItems[current];
    setFallbackValue(option?.value ?? undefined);
    setLegendItems(
      legendItems.map((o, i) => ({
        name: o.name,
        inactive: current !== i,
        color: countries[0].color,
      }))
    );
  }, [current]);

  const countryMetas = countries as CountryMeta[];
  const lastPoint = countriesData[countriesData.length - 1];

  return (
    <>
      <div>
        <span className="text-sm font-medium text-card-foreground">
          Select a fallback value for missing data points
        </span>
        <VisBulletLegend
          items={items}
          onLegendItemClick={useCallback(
            (_item: BulletLegendItemInterface, i: number) => setCurrent(i),
            []
          )}
        />
      </div>
      <VisXYContainer height={height} xDomain={[1961, 2022]} yDomain={[0, 650]}>
        <VisLine
          data={countriesData}
          x={useCallback((d: CountryGdpDatum) => d.year, [])}
          y={useMemo(() => countryMetas.map(getY), [getY, countryMetas])}
          fallbackValue={fallbackValue}
          color={`hsl(${
            theme?.cssVars[mode === "dark" ? "dark" : "light"].warning
          })`}
        />

        <VisXYLabels
          data={countryMetas}
          x={2019.5}
          y={useCallback(
            (c: CountryMeta) => (lastPoint ? getY(c)(lastPoint) : 0),
            [getY, lastPoint]
          )}
          label={useCallback((c: CountryMeta) => c.label, [])}
          backgroundColor="none"
        />

        <VisAxis
          type="x"
          numTicks={10}
          tickTextColor={`hsl(${
            theme?.cssVars[
              mode === "dark" || mode === "system" ? "dark" : "light"
            ].chartLabel
          })`}
        />
        <VisAxis
          type="y"
          tickFormat={(d) => `${d}${d ? "M" : ""}`}
          tickValues={[0, 200, 400, fallbackValue ?? 0, 600].filter(
            (v, i, arr) => v !== undefined && arr.indexOf(v) === i
          )}
          tickTextColor={`hsl(${
            theme?.cssVars[
              mode === "dark" || mode === "system" ? "dark" : "light"
            ].chartLabel
          })`}
        />
      </VisXYContainer>
    </>
  );
};

export default DataGapsLine;