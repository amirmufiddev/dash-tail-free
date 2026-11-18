"use client";
import { useCallback } from "react";
import { VisXYContainer, VisAxis, VisArea, VisXYLabels } from "@unovis/react";
import { stackedData } from "./data";
import type { MusicFormatKey, StackedAreaDatum } from "../datum-types";
import { useTheme } from "next-themes";
import { useThemeStore } from "@/store";
import { themes } from "@/config/thems";

type XYLabelConfig = {
  label: string;
  value: number;
  color: string;
};

export default function StackedArea() {
  const { theme: config, setTheme: setConfig } = useThemeStore();
  const { theme: mode } = useTheme();
  const theme = themes.find((theme) => theme.name === config);

  const Format = {
    Vinyl: "vinyl",
    Cassette: "cassette",
    Cd: "cd",
    Download: "download",
    Streaming: "streaming",
  } as const;

  const formats: MusicFormatKey[] = [
    Format.Vinyl,
    Format.Cassette,
    Format.Cd,
    Format.Download,
    Format.Streaming,
  ];

  function getMaxItems(array: StackedAreaDatum[], keys: MusicFormatKey[]) {
    const maxIndex = (k: MusicFormatKey) =>
      array.reduce(
        (max, curr, i) => (curr[k] ?? 0) > (array[max][k] ?? 0) ? i : max,
        0
      );

  return Object.fromEntries(
    keys.map((key) => [key, array[maxIndex(key)]])
  ) as Record<MusicFormatKey, StackedAreaDatum>;
  }

  function getLabels(data: StackedAreaDatum[]) {
    const peakItems = getMaxItems(data.slice(0, data.length - 3), formats);
    return formats.reduce<Record<number, XYLabelConfig>>((obj, format, i) => {
      const peak = peakItems[format];
      const offset = Array(i)
        .fill(0)
        .reduce((sum, _, j) => sum + (peakItems[formats[j]][formats[j]] ?? 0), 0);
      const formatValue = peak[format] ?? 0;
      const x = peak.year;
      const y = offset + formatValue / 2;

      obj[x] = {
        label:
          format === "cd"
            ? format.toUpperCase()
            : format.charAt(0).toUpperCase() + format.slice(1),
        value: y,
        color: "none",
      };

      return obj;
    }, {});
  }

  const labels = getLabels(stackedData);

  return (
    <>
      <VisXYContainer<StackedAreaDatum> data={stackedData} height={"50vh"}>
        <VisArea
          x={useCallback((d: StackedAreaDatum) => d.year, [])}
          y={formats.map((g) =>
            useCallback((d: StackedAreaDatum) => d[g] ?? 0, [])
          )}
        />
        <VisAxis
          type="x"
          label="Year"
          numTicks={10}
          gridLine={false}
          domainLine={false}
        />
        <VisAxis
          type="y"
          label="Revenue (USD, billions)"
          numTicks={10}
          tickTextColor={`hsl(${
            theme?.cssVars[
              mode === "dark" || mode === "system" ? "dark" : "light"
            ].chartLabel
          })`}
        />
        <VisXYLabels
          x={useCallback(
            (d: StackedAreaDatum) => (labels[d.year] ? d.year : undefined),
            []
          )}
          y={useCallback(
            (d: StackedAreaDatum) => labels[d.year]?.value,
            []
          )}
          label={useCallback(
            (d: StackedAreaDatum) => labels[d.year]?.label,
            []
          )}
          backgroundColor={useCallback(
            (d: StackedAreaDatum) => labels[d.year]?.color ?? "none",
            []
          )}
          clusterBackgroundColor="none"
          clusterLabel={() => ""}
        />
      </VisXYContainer>
    </>
  );
}