"use client"
import type { GeoJsonObject } from "geojson";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import L, { divIcon } from "leaflet";
import seg from "./seg.json";
import ecomp from "./ecomp.json";
const GeoJSONMap = ({ height = 350 }) => {
    const position: [number, number] = [37.5004851, -96.2261503];
    const setColor = () => {
        return { weight: 1 };
    };

    const customMarkerIcon = (name) =>
        divIcon({
            html: name,
            className: "icon",
        });
    const setIcon = ({ properties }, latlng) => {
        return L.marker(latlng, { icon: customMarkerIcon(properties.Name) });
    };
    return (

        <MapContainer
            center={position}
            zoom={4}
            maxZoom={18}
            zoomControl={false}
            minZoom={3}
            scrollWheelZoom={false}
            style={{ height: height, width: "100%" }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <GeoJSON data={seg as GeoJsonObject} style={setColor} />
            <GeoJSON data={ecomp as GeoJsonObject} pointToLayer={setIcon} />
        </MapContainer>

    );
};

export default GeoJSONMap;
