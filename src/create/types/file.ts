import type { Options } from "@/create";

export interface FileAction {
  modify?: (contents: string, options: Options) => string;
}

export type FileMapping = {
  from: string;
  to: string;
  isGlobal?: boolean;
  action?: {
    modify?: (contents: string, options: Options) => string;
  };
};

export type FileSlice = FileMapping[] | ((options: Options) => FileMapping[]);

export type FileRegistry<T extends string | symbol | number> = Readonly<
  Partial<Record<T, FileSlice>>
>;

export type FileIntersection = {
  condition: (options: Options) => boolean;
  files: FileSlice;
};
