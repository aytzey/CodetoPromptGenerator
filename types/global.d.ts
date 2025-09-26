declare module "picomatch" {
  const picomatch: (pattern: string | string[], options?: Record<string, unknown>) => (input: string) => boolean;
  export default picomatch;
}

declare module "react-window" {
  export const FixedSizeList: any;
  export const VariableSizeList: any;
  export type ListOnScrollProps = any;
  export type ListChildComponentProps = any;
}
