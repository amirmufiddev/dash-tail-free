"use client";

import { useCallback, useState } from "react";
import { FreeBrushMode, Scale, Position } from "@unovis/ts";
import {
  VisXYContainer,
  VisScatter,
  VisAxis,
  VisBulletLegend,
  VisFreeBrush,
} from "@unovis/react";
import { brushChartData } from "./data";
import type { FreeBrushSelection, ScatterBrushDatum } from "../datum-types";

type UnovisBrush = [number, number] | [[number, number], [number, number]];

function isXYBrush(
  value: UnovisBrush
): value is [[number, number], [number, number]] {
  return typeof value[0] !== "number";
}
import { unovisTickFormat } from "@/lib/unovis-chart";
import { useThemeStore } from "@/store";
import { useTheme } from "next-themes";
import { themes } from "@/config/thems";

const formatNumber = unovisTickFormat((value) =>
  Intl.NumberFormat("en", { notation: "compact" }).format(value)
);

const FreeBrushScatter = () => {
  const { theme: config, setTheme: setConfig } = useThemeStore();
  const { theme: mode } = useTheme();
  const theme = themes.find((theme) => theme.name === config);

  const palette = [
    `hsl(${theme?.cssVars[mode === "dark" ? "dark" : "light"].primary})`,
    `hsl(${theme?.cssVars[mode === "dark" ? "dark" : "light"].info})`,
    `hsl(${theme?.cssVars[mode === "dark" ? "dark" : "light"].warning})`,
    `hsl(${theme?.cssVars[mode === "dark" ? "dark" : "light"].success})`,
  ];

  const categories = Array.from(
    new Set(brushChartData.map((d) => d.category))
  ).sort();
  const colorScale = Scale.scaleOrdinal(palette).domain(categories);

  const legendItems = categories.map((v) => ({
    name: v,
    color: colorScale(v),
  }));
  const [selection, setSelection] = useState<FreeBrushSelection | undefined>();

  const scatterProps = {
    x: useCallback((d: ScatterBrushDatum) => d.medianSalary, []),
    y: useCallback((d: ScatterBrushDatum) => d.employmentRate, []),
    color: useCallback((d: ScatterBrushDatum) => colorScale(d.category), []),
    size: useCallback((d: ScatterBrushDatum) => d.total, []),
    label: useCallback((d: ScatterBrushDatum) => d.major, []),
    id: useCallback((d: ScatterBrushDatum) => d.major, []),
  };

  return (
    <>
      <VisBulletLegend items={legendItems} />
      <VisXYContainer<ScatterBrushDatum>
        className="minimap"
        data={brushChartData}
        height={125}
      >
        <VisScatter {...scatterProps} sizeRange={[3, 10]} label={undefined} />
        <VisFreeBrush
          selectionMinLength={[0, 0]}
          autoHide={false}
          onBrushEnd={useCallback((value: UnovisBrush | undefined) => {
            if (!value || !isXYBrush(value)) {
              setSelection(undefined);
              return;
            }
            setSelection([value[0], value[1]]);
          }, [])}
          mode={FreeBrushMode.XY}
        />
      </VisXYContainer>
      <VisXYContainer<ScatterBrushDatum>
        data={brushChartData}
        xDomain={selection?.[0]}
        yDomain={selection?.[1]}
        height={"55vh"}
        scaleByDomain={true}
      >
        <VisScatter
          {...scatterProps}
          sizeRange={[20, 80]}
          labelPosition={Position.Bottom}
        />
        <VisAxis type="x" label="Median Salary ($)" tickFormat={formatNumber} gridLine={false} />
        <VisAxis type="y" label="Employment Rate" tickPadding={0} gridLine={false} />
      </VisXYContainer>
    </>
  );
};

export default FreeBrushScatter;