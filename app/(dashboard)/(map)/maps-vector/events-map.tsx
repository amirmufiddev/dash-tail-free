"use client"

import { useState, type FocusEvent, type MouseEvent } from "react";
import world from "./worldmap.json";
import { VectorMap } from "@south-paw/react-vector-maps";

const EventVMap = ({ height = 350 }) => {

    const [hovered, setHovered] = useState('None');
    const [focused, setFocused] = useState('None');
    const [clicked, setClicked] = useState('None');

    const layerName = (event: MouseEvent<SVGPathElement> | FocusEvent<SVGPathElement>) =>
        event.currentTarget.getAttribute("name") ?? "None";

    const layerProps = {
        onMouseEnter: (event: MouseEvent<SVGPathElement>) => setHovered(layerName(event)),
        onMouseLeave: () => setHovered("None"),
        onFocus: (event: FocusEvent<SVGPathElement>) => setFocused(layerName(event)),
        onBlur: () => setFocused("None"),
        onClick: (event: MouseEvent<SVGPathElement>) => setClicked(layerName(event)),
    };

    return (
        <div>
            <div className={`w-full h-[${height}px]`}>
                <VectorMap  {...world} layerProps={layerProps} className="h-full w-full object-cover dashtail-codeVmapInfo" />
            </div>
            <div className="text-center">
                <p className="text-sm font-medium text-card-foreground">Hovered: {hovered && <strong className="text-primary">{hovered}</strong>}</p>
                <p className="text-sm font-medium text-card-foreground">Focused: {focused && <strong className="text-primary">{focused}</strong>}</p>
                <p className="text-sm font-medium text-card-foreground">Clicked: {clicked && <strong className="text-primary">{clicked}</strong>}</p>
            </div>

        </div>
    )
};

export default EventVMap;