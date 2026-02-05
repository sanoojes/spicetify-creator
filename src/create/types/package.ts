import type { Options } from "@/create";
import type { FrameworkType, LinterType } from "@/metadata";

export interface PackageJSON {
  name?: string;
  version?: string;
  private?: boolean;
  description?: string;
  type?: "module" | "commonjs";
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export type PackageSlice = Pick<PackageJSON, "scripts" | "dependencies" | "devDependencies">;

export type FeatureRegistry<T extends string | symbol | number> = Readonly<
  Partial<Record<T, PackageSlice>>
>;

export type FrameworkTemplate = FeatureRegistry<FrameworkType>;

export type IntersectionType = "reactEslint";
export type LinterTemplate = FeatureRegistry<LinterType>;

export type Intersection = PackageSlice & {
  condition: (opts: Options) => boolean;
};

export type IntersectionRegistry<T extends string | symbol | number> = Readonly<
  Partial<Record<T, Intersection>>
>;
export type IntersectionTemplate = IntersectionRegistry<IntersectionType>;
