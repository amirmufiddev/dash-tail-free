/** Shared datum shapes for Unovis chart demos under strict TypeScript. */

export type ElectionVoteDatum = {
  year: number;
  republican: number;
  democrat: number;
  other: number;
  libertarian: number;
};

export type EducationDatum = {
  country: string;
  masters: number;
  doctoral: number;
  bachelors: number;
  total?: number;
};

export type ProductTimelineDatum = {
  startDate: number;
  endDate: number;
  name: string;
  type: string;
  description: string;
};

export type MusicStreamDatum = Record<string, number | string> & {
  year: number;
};

export type BrushChartDatum = {
  year: number;
} & Record<string, number | null>;

export type BrushGroupMeta = {
  key: string;
  name: string;
  inactive?: boolean;
};

export type CovidAreaDatum = {
  month: string;
  year: string;
  cases: { us: number; in: number };
};

export type BaselineAreaDatum = {
  year: number;
  art: number[];
};

export type BaselineCategory = {
  id: number;
  name: string;
};

export type StackedAreaDatum = {
  year: number;
  vinyl?: number;
  cassette?: number;
  cd?: number;
  download?: number;
  streaming?: number;
} & Record<string, number | undefined>;

export type MusicFormatKey =
  | "vinyl"
  | "cassette"
  | "cd"
  | "download"
  | "streaming";

export type SentimentBlock = {
  neutral?: number;
  negative: number;
  positive: number;
};

export type StepSentimentDatum = {
  year: number;
  [candidate: string]: SentimentBlock | number | undefined;
};

export type MultiLineWeatherDatum = {
  date: string;
  sf: number | null;
  ny: number | null;
  austin: number | null;
};

export type CountryGdpDatum = {
  year: number;
  us: number;
  cn?: number;
};

export type ScatterJobDatum = {
  major: string;
  category: string;
  total: number;
  employmentRate: number;
  medianSalary: number;
};

export type ScatterBrushDatum = ScatterJobDatum;

export type FreeBrushSelection = [
  [number, number] | undefined,
  [number, number] | undefined,
];