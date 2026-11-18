declare module "mdast-util-toc" {
  export function toc(node: unknown): { map: unknown };
}

declare module "remark" {
  interface Processor {
    use(plugin: unknown): Processor;
    process(content: string): Promise<{ data: unknown }>;
  }
  export function remark(): Processor;
}
