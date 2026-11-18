"use client"

import { useState, type MouseEvent } from "react";
import world from "./worldmap.json";
import { VectorMap } from "@south-paw/react-vector-maps";

const SelectingLayers = ({ height = 250 }) => {

    const [selected, setSelected] = useState<string[]>([]);

    const onClick = (event: MouseEvent<SVGPathElement>) => {
        const id = event.currentTarget.getAttribute("id") ?? "";
        setSelected((current) =>
            current.includes(id) ? current.filter((sid) => sid !== id) : [...current, id]
        );
    }
    return (
        <div>
            <div className={`w-full h-[${height}px]`}>
                <VectorMap {...world} layerProps={{ onClick }} className="h-full w-full object-cover dashtail-codeVmapWarning" />
            </div>
            <div className="text-center">
                <p className="text-sm font-medium text-card-foreground">Selected:</p>
                <pre className="text-sm font-medium text-card-foreground">{JSON.stringify(selected, null, 2)}</pre>
            </div>
        </div>

    );
};

export default SelectingLayers;
