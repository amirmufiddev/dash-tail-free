import type { LabelProps, DotProps } from "recharts";
import type { ReactNode } from "react";

export type ScatterBubblePoint = {
  hour: string;
  index: number;
  value: number;
};

type ScatterTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ScatterBubblePoint }>;
};

export function scatterBubbleTooltip(props: ScatterTooltipProps): ReactNode {
  const { active, payload } = props;
  if (!active || !payload?.length) {
    return null;
  }
  const point = payload[0]?.payload;
  if (!point) {
    return null;
  }
  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #999",
        margin: 0,
        padding: 10,
      }}
    >
      <p>{point.hour}</p>
      <p>
        <span>value: </span>
        {point.value}
      </p>
    </div>
  );
}

export type BarLabelProps = LabelProps & {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: string | number;
};

export type CustomDotProps = DotProps & {
  cx?: number;
  cy?: number;
  stroke?: string;
  payload?: Record<string, unknown>;
  value?: number;
};