import React, { CSSProperties, useEffect, useState } from "react";

/**
 * generate svg string for watermark
 */
function generateSvg(options: {
  text: string;
  textColor: string;
  textSize: string;
  fontFamily: string;
  lineHeight: string;
  multiline: boolean;
  opacity: string;
  gutter: number;
  rotate: string;
}) {
  const {
    text,
    textColor,
    textSize,
    fontFamily,
    lineHeight,
    multiline,
    opacity,
    gutter,
    rotate,
  } = options;
  const rect = calcTextRenderedRect(
    text,
    Number(textSize),
    lineHeight,
    fontFamily
  );
  const size =
    Math.sqrt(rect.width * rect.width + rect.height * rect.height) + gutter * 2;
  const center = size / 2;

  let textContent = text;
  if (multiline) {
    const texts = text.split("\n").map((textByLine, index) => {
      return `<tspan x='50%' dy='${
        index === 0 ? "0" : lineHeight
      }'>${textByLine}</tspan>`;
    });
    textContent = texts.join("");
  }

  const textEl = `<text fill='${textColor}' x='50%' y='50%' font-size='${textSize}' text-anchor='middle' font-family='${fontFamily}' transform='rotate(${rotate} ${center} ${center})' opacity='${opacity}'>${textContent}</text>`;

  return `<svg width='${size}' height='${
    size / 1.5
  }' xmlns='http://www.w3.org/2000/svg'>${textEl}</svg>`;
}

function calcTextRenderedRect(
  text: string,
  fontSize: number,
  _lineHeight: string,
  fontFamily: string
) {
  const span = document.createElement("span");
  span.innerText = text;
  span.style.fontSize = `${fontSize}px`;
  span.style.fontFamily = fontFamily;
  span.style.visibility = "hidden";
  document.body.appendChild(span);
  const rect = span.getBoundingClientRect();
  document.body.removeChild(span);
  return rect;
}

const watermarkWrapperStyle: CSSProperties = {
  position: "relative",
};

type WatermarkProps = {
  show?: boolean;
  text?: string;
  image?: string;
  textColor?: string;
  textSize?: number;
  fontFamily?: string;
  opacity?: number;
  lineHeight?: string;
  multiline?: boolean;
  wrapperStyle?: CSSProperties;
  wrapperElement?: React.ElementType;
  gutter?: number;
  rotate?: number;
  zIndex?: number;
  children?: React.ReactNode;
};

const Watermark = ({
  show = true,
  text = "",
  image,
  textColor = "#cccccc",
  textSize = 24,
  fontFamily,
  opacity = 0.2,
  lineHeight = "1.2rem",
  multiline = false,
  wrapperStyle,
  wrapperElement = "div",
  gutter = 16,
  rotate = -45,
  zIndex = 1,
  children,
}: WatermarkProps) => {
  const [backgroundImage, setBackgroundImage] = useState("");

  useEffect(() => {
    if (image) {
      const gutteredSvg = `
        <svg xmlns='http://www.w3.org/2000/svg' width='${
          gutter + 100
        }' height='${gutter + 100}' viewBox='0 0 ${gutter + 100} ${
        gutter + 100
      }'>
          <rect x='0' y='0' width='${gutter + 100}' height='${
        gutter + 100
      }' fill='transparent' />
          <image href='${image}' x='${gutter / 2}' y='${
        gutter / 2
      }' width='100' height='100' />
        </svg>
      `;
      const convertedSvg = encodeURIComponent(gutteredSvg);
      // .replace(/'/g, "%27")
      // .replace(/"/g, "%22");
      setBackgroundImage(`url(${image})`);
    } else {
      const svg = generateSvg({
        text,
        textColor,
        textSize: String(textSize),
        fontFamily: fontFamily ?? "sans-serif",
        opacity: String(opacity),
        gutter,
        rotate: String(rotate),
        multiline,
        lineHeight,
      });
      const convertedSvg = encodeURIComponent(svg)
        .replace(/'/g, "%27")
        .replace(/"/g, "%22");
      setBackgroundImage(`url("data:image/svg+xml,${convertedSvg}")`);
    }
  }, [show, text, textColor, textSize, opacity, gutter, rotate, image]);

  const watermarkStyle: CSSProperties = {
    pointerEvents: "none",
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundRepeat: "repeat",
    zIndex,
    backgroundImage,
    backgroundPosition: "0 0",
  };

  const Wrapper = wrapperElement;

  return (
    <Wrapper style={{ ...watermarkWrapperStyle, ...wrapperStyle }}>
      {show && <div style={watermarkStyle} />}
      {children}
    </Wrapper>
  );
};

export default Watermark;
