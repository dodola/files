// Stub for @tweakpane/core — the package is bundled inside tweakpane
// but not installed as a separate node_modules entry. We provide minimal
// type declarations so that Pane (which extends FolderApi from this module)
// resolves correctly.

declare module '@tweakpane/core' {
  export interface PluginPool {}
  export interface TpPluginBundle {}

  export class FolderApi {
    addBinding(object: object, key: string, options?: object): BindingHandle;
    addFolder(params: { title: string; expanded?: boolean }): FolderApi;
    addButton(params: { title: string }): { on(event: 'click', handler: () => void): any };
    addBlade(params: object): any;
    on(event: string, handler: (ev: any) => void): this;
  }

  export interface BindingHandle {
    on(event: 'change', handler: (ev: { value: any }) => void): this;
    on(event: string, handler: (ev: any) => void): this;
  }

  // Re-export everything else as any so imports don't fail
  export const ArrayStyleListOptions: any;
  export const BaseParams: any;
  export const BaseBladeParams: any;
  export const BindingApiEvents: any;
  export const BindingParams: any;
  export const BladeApi: any;
  export const BooleanInputParams: any;
  export const BooleanMonitorParams: any;
  export const ButtonApi: any;
  export const ButtonParams: any;
  export const ColorInputParams: any;
  export const FolderParams: any;
  export const InputBindingApi: any;
  export const ListInputBindingApi: any;
  export const ListParamsOptions: any;
  export const MonitorBindingApi: any;
  export const NumberInputParams: any;
  export const NumberMonitorParams: any;
  export const ObjectStyleListOptions: any;
  export const Point2dInputParams: any;
  export const Point3dInputParams: any;
  export const Point4dInputParams: any;
  export const Semver: any;
  export const SliderInputBindingApi: any;
  export const StringInputParams: any;
  export const StringMonitorParams: any;
  export const TabApi: any;
  export const TabPageApi: any;
  export const TabPageParams: any;
  export const TabParams: any;
  export const TpChangeEvent: any;
  export const TpPlugin: any;
}
