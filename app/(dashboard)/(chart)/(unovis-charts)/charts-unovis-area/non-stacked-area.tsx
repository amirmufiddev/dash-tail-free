"use client";

import { useCallback } from "react";
import { CurveType } from "@unovis/ts";
import {
  VisXYContainer,
  VisAxis,
  VisArea,
  VisBulletLegend,
} from "@unovis/react";
import { data } from "./data";
import type { CovidAreaDatum } from "../datum-types";
import { unovisTickFormat } from "@/lib/unovis-chart";
import { useThemeStore } from "@/store";
import { useTheme } from "next-themes";
import { themes } from "@/config/thems";

const NonStackedArea = ({ height = 400 }) => {
  const { theme: config, setTheme: setConfig } = useThemeStore();
  const { theme: mode } = useTheme();
  const theme = themes.find((theme) => theme.name === config);

  const Country = {
    UnitedStates: "us",
    India: "in",
  } as const;

  type CountryId = (typeof Country)[keyof typeof Country];

  const countries: Record<CountryId, { name: string; color: string }> = {
    [Country.UnitedStates]: {
      name: "United States",
      color: `hsl(${theme?.cssVars[mode === "dark" ? "dark" : "light"].info})`,
    },
    [Country.India]: {
      name: "India",
      color: `hsl(${
        theme?.cssVars[mode === "dark" ? "dark" : "light"].warning
      })`,
    },
  };

  const x = useCallback((_d: CovidAreaDatum, i: number) => i, []);
  const accessors = (id: CountryId) => ({
    y: useCallback((d: CovidAreaDatum) => d.cases[id], []),
    color: countries[id].color,
  });

  const xTicks = useCallback(
    (tick: number | Date, i: number) => {
      const row = data[i];
      if (!row || typeof tick !== "number") return "";
      return [row.month, row.year].join("");
    },
    []
  );
  const compactNumber = useCallback(
    unovisTickFormat((value) =>
      Intl.NumberFormat(navigator.language, { notation: "compact" }).format(
        value
      )
    ),
    []
  );

  return (
    <VisXYContainer<CovidAreaDatum> data={data} height={height}>
      <VisBulletLegend items={Object.values(countries)} />
      <VisArea
        {...accessors(Country.UnitedStates)}
        x={x}
        opacity={0.7}
        curveType={CurveType.Basis}
      />
      <VisArea
        {...accessors(Country.India)}
        x={x}
        opacity={0.7}
        curveType={CurveType.Basis}
      />
      <VisAxis
        type="x"
        tickFormat={xTicks}
        tickTextColor={`hsl(${
          theme?.cssVars[
            mode === "dark" || mode === "system" ? "dark" : "light"
          ].chartLabel
        })`}
      />
      <VisAxis
        type="y"
        tickFormat={compactNumber}
        tickTextColor={`hsl(${
          theme?.cssVars[
            mode === "dark" || mode === "system" ? "dark" : "light"
          ].chartLabel
        })`}
      />
    </VisXYContainer>
  );
};

export default NonStackedArea;