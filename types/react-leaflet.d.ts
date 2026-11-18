import "@react-leaflet/core";

declare module "@react-leaflet/core" {
  interface CircleProps {
    color?: string;
    fillColor?: string;
    fillOpacity?: number;
    stroke?: boolean;
    weight?: number;
    opacity?: number;
    radius?: number;
  }
  interface CircleMarkerProps {
    color?: string;
    fillColor?: string;
    fillOpacity?: number;
    stroke?: boolean;
    weight?: number;
    opacity?: number;
    radius?: number;
  }
}

declare module "react-leaflet" {
  interface FeatureGroupProps {
    color?: string;
  }
}
