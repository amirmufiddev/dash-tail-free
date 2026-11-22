"use client";

import { VisLeafletMap } from "@unovis/react";
import { mapData } from "./mapData";
import { MAP_KEY } from "../constant";

const MapWithData = () => {

    const style = `https://api.maptiler.com/maps/backdrop/style.json?key=${MAP_KEY}`;

    return (
        <div className=" w-full h-[350px] overflow-hidden relative">
            <VisLeafletMap
                height="100%"
                style={style}
                data={mapData}
                attribution={[
                    '<a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a>',
                    '<a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>',
                ]}
            />
        </div>
    );
};

export default MapWithData;
