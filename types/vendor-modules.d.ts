declare module "bcrypt" {
  interface Bcrypt {
    compare(data: string, encrypted: string): Promise<boolean>;
    hash(data: string, saltOrRounds: string | number): Promise<string>;
    genSalt(rounds?: number): Promise<string>;
  }
  const bcrypt: Bcrypt;
  export default bcrypt;
}

declare module "google-map-react" {
  import type * as React from "react";

  interface GoogleMapReactProps {
    bootstrapURLKeys?: {
      key?: string;
      language?: string;
      region?: string;
      libraries?: string[];
    };
    defaultCenter?: { lat: number; lng: number };
    center?: { lat: number; lng: number };
    defaultZoom?: number;
    zoom?: number;
    children?: React.ReactNode;
  }

  const GoogleMapReact: React.ComponentType<GoogleMapReactProps>;
  export default GoogleMapReact;
}

declare module "prop-types" {
  interface Validator<T> {
    isRequired: Validator<T>;
  }

  interface PropTypeValidators {
    node: Validator<unknown>;
    number: Validator<number>;
    func: Validator<(...args: unknown[]) => unknown>;
    string: Validator<string>;
    bool: Validator<boolean>;
    object: Validator<object>;
    array: Validator<unknown[]>;
  }

  const PropTypes: PropTypeValidators;
  export default PropTypes;
}

declare module "react-syntax-highlighter" {
  import type * as React from "react";

  interface SyntaxHighlighterProps {
    language?: string;
    style?: { [key: string]: React.CSSProperties };
    children?: React.ReactNode;
    className?: string;
    showLineNumbers?: boolean;
    wrapLongLines?: boolean;
    customStyle?: React.CSSProperties;
  }

  const SyntaxHighlighter: React.ComponentType<SyntaxHighlighterProps>;
  export default SyntaxHighlighter;
}

declare module "react-syntax-highlighter/dist/esm/styles/hljs" {
  import type * as React from "react";
  export const atomOneDark: { [key: string]: React.CSSProperties };
}

declare module "cleave.js/react" {
  import type * as React from "react";

  interface CleaveProps extends React.InputHTMLAttributes<HTMLInputElement> {
    options?: { [key: string]: unknown };
  }

  const Cleave: React.ForwardRefExoticComponent<
    CleaveProps & React.RefAttributes<HTMLInputElement>
  >;
  export default Cleave;
}
