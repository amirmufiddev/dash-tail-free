"use client";

import { useCallback, useMemo, useState } from "react";
import {
  VisXYContainer,
  VisArea,
  VisAxis,
  VisBulletLegend,
} from "@unovis/react";
import { CurveType } from "@unovis/ts";
import { useTheme } from "next-themes";
import { useThemeStore } from "@/store";
import { themes } from "@/config/thems";
import { stepData } from "./data";
import type { StepSentimentDatum } from "../datum-types";

const candidates = ["Hillary Clinton", "Donald Trump"].map((c) => ({
  name: c,
  color: "var(--vis-color-grey)",
}));

type SentimentField = "neutral" | "negative" | "positive";

function readSentiment(
  d: StepSentimentDatum,
  candidate: string,
  field: SentimentField
): number {
  const block = d[candidate];
  if (block && typeof block === "object") {
    return block[field] ?? 0;
  }
  return 0;
}

const StepAreaChart = () => {
  const { theme: config, setTheme: setConfig } = useThemeStore();
  const { theme: mode } = useTheme();
  const theme = themes.find((theme) => theme.name === config);

  const [curr, setCurr] = useState(candidates[0].name);
  const items = useMemo(
    () => candidates.map((c) => ({ ...c, inactive: curr !== c.name })),
    [curr]
  );

  const firstRow = stepData[0];
  const sentimentKeys =
    firstRow && typeof firstRow[curr] === "object" && firstRow[curr]
      ? Object.keys(firstRow[curr])
      : [];

  return (
    <div className="step-area-chart">
      <div className="panel">
        <VisBulletLegend items={sentimentKeys.map((d) => ({ name: d }))} />
        <div className="legendSwitch">
          <VisBulletLegend
            items={items}
            onLegendItemClick={(i) => setCurr(String(i.name))}
          />
        </div>
      </div>
      <VisXYContainer<StepSentimentDatum>
        data={stepData}
        height={"50vh"}
        yDomain={[0, 42]}
      >
        <VisArea
          x={useCallback((d: StepSentimentDatum) => d.year, [])}
          y={[
            useCallback(
              (d: StepSentimentDatum) => readSentiment(d, curr, "neutral"),
              [curr]
            ),
            useCallback(
              (d: StepSentimentDatum) => readSentiment(d, curr, "negative"),
              [curr]
            ),
            useCallback(
              (d: StepSentimentDatum) => readSentiment(d, curr, "positive"),
              [curr]
            ),
          ]}
          curveType={CurveType.StepAfter}
        />
        <VisAxis
          type="x"
          label="Month"
          tickTextColor={`hsl(${
            theme?.cssVars[
              mode === "dark" || mode === "system" ? "dark" : "light"
            ].chartLabel
          })`}
        />
        <VisAxis
          type="y"
          label="News Stories"
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

export default StepAreaChart;