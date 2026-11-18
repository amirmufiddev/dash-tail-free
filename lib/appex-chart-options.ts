import type { ApexOptions } from "apexcharts";

export const getYAxisConfig = (colors: string): ApexOptions["yaxis"] => ({
  labels: getLabel(colors),
});

export const getXAxisConfig = (colors: string): ApexOptions["xaxis"] => ({
  categories: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  labels: getLabel(colors),
  axisBorder: {
    show: false,
  },
  axisTicks: {
    show: false,
  }

});

export const getLabel = (colors: string) => ({
  style: {
    colors: colors,
    fontFamily: "Inter",
  },
});

export const getGridConfig = (colors: string): ApexOptions["grid"] => ({
  show: true,
  borderColor: colors,
  strokeDashArray: 10,
  position: "back",
});
