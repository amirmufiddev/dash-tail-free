import type { ForwardRefExoticComponent, ForwardRefRenderFunction, ReactNode, RefAttributes } from "react";

type LooseForwardRefProps = { children?: ReactNode; className?: string } & Record<string, unknown>;

declare module "react" {
  function forwardRef<T = HTMLElement>(
    render: ForwardRefRenderFunction<T, LooseForwardRefProps>,
  ): ForwardRefExoticComponent<LooseForwardRefProps & RefAttributes<T>>;
}