"use client"
import type { StyleSpecification } from "maplibre-gl";
import { useCallback, useMemo, useRef } from 'react'
import { LeafletMap, type LeafletMapClusterDatum } from '@unovis/ts'
import { VisLeafletMap, type VisLeafletMapRef } from '@unovis/react'
import { data, totalEvents, mapStyleLight, mapStyleDark } from './data'

import { useThemeStore } from "@/store";
import { useTheme } from "next-themes";
import { themes } from "@/config/thems";

type SiteDatum = {
    latitude: number;
    longitude: number;
    name: string;
    normal: number;
    blocked: number;
};

const AdvancedLeafletMap = ({ height = 350 }) => {

    const { theme: config, setTheme: setConfig } = useThemeStore();
    const { theme: mode } = useTheme();
    const theme = themes.find((theme) => theme.name === config);

    const mapRef = useRef<VisLeafletMapRef<SiteDatum>>(null);
    const pointId = (d: { name: string }) => d.name;
    const pointLatitude = (d: { latitude: number }) => d.latitude;
    const pointLongitude = (d: { longitude: number }) => d.longitude;
    const pointBottomLabel = (d: { name: string }) => d.name;
    const pointRadius = (d: { normal?: number; blocked?: number }) =>
        10 + 4 * Math.sqrt(((d.normal ?? 0) + (d.blocked ?? 0)) / totalEvents);
    const pointLabel = (d: { blocked?: number; normal?: number }) =>
        `${(((d.blocked ?? 0) + (d.normal ?? 0)) / 1000).toFixed(1)}K`;
    const clusterBottomLabel = (d: LeafletMapClusterDatum<SiteDatum>) =>
        `${d.point_count} sites`;

    const colorMap = {
        normal: { color: `hsl(${theme?.cssVars[mode === "dark" ? "dark" : "light"].primary})` },
        blocked: { color: `hsl(${theme?.cssVars[mode === "dark" ? "dark" : "light"].info})` },
    }

    const events = {
        [LeafletMap.selectors.point]: {
            click: (d: { properties?: { cluster?: boolean }; id?: string | number }) => {
                if (d.properties?.cluster || d.id == null) return;
                mapRef.current?.component?.zoomToPointById(String(d.id), true, 5)
            },
        },
        [LeafletMap.selectors.background]: {
            click: () => { mapRef.current?.component?.unselectPoint() },
        },
    }

    const attribution = [
        '<a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a>',
        '<a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>',
    ]

    return (
        <div className={`w-full  overflow-hidden relative h-[${height}px]`}>
            <VisLeafletMap
                ref={mapRef}
                data={data}
                style={mapStyleLight as StyleSpecification}
                styleDarkTheme={mapStyleDark as StyleSpecification}
                pointId={useCallback(pointId, [])}
                pointLatitude={useCallback(pointLatitude, [])}
                pointLongitude={useCallback(pointLongitude, [])}
                pointLabel={useCallback(pointLabel, [])}
                pointBottomLabel={useCallback(pointBottomLabel, [])}
                pointRadius={useCallback(pointRadius, [])}
                colorMap={useMemo(() => colorMap, [])}
                clusterRadius={useCallback(pointRadius, [])}
                clusterLabel={useCallback(pointLabel, [])}
                clusterBottomLabel={useCallback(clusterBottomLabel, [])}
                clusteringDistance={85}
                clusterExpandOnClick={true}
                attribution={useMemo(() => attribution, [])}
                events={useMemo(() => events, [])}
            />
        </div>
    )
}

export default AdvancedLeafletMap;