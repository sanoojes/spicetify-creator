import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { cancel, log } from "@clack/prompts";
import type { Options } from "@/create";
import type {
  FrameworkTemplate,
  IntersectionTemplate,
  LinterTemplate,
  PackageJSON,
  PackageSlice,
} from "@/create/types/package";
import { env } from "@/env";
import { mkdirp } from "@/utils/fs";

const FRAMEWORKS: FrameworkTemplate = {
  react: {
    dependencies: {
      react: "^18.3.1",
      "react-dom": "^18.3.1",
    },
    devDependencies: {
      "@types/react": "^18.3.27",
      "@types/react-dom": "^18.3.7",
    },
  },
  vanilla: {},
};

const LINTERS: LinterTemplate = {
  eslint: {
    scripts: {
      lint: "eslint .",
    },
    devDependencies: {
      eslint: "^9.39.2",
      "@eslint/js": "^9.39.2",
      "@eslint/css": "^0.14.1",
      globals: "^17.2.0",
    },
  },
  biome: {
    scripts: {
      lint: "biome check --apply .",
    },
    devDependencies: {
      "@biomejs/biome": "latest",
    },
  },
  oxlint: {
    scripts: {
      lint: "oxlint",
      "lint:fix": "oxlint --fix",
    },
    devDependencies: {
      oxlint: "^1.43.0",
    },
  },
};

const INTERSECTIONS: IntersectionTemplate = {
  reactEslint: {
    condition: (options) => options.framework === "react" && options.linter === "eslint",
    devDependencies: {
      "eslint-plugin-react": "^7.37.5",
      "typescript-eslint": "^8.54.0",
    },
  },
};

export function createPackageJSON(options: Options): PackageJSON {
  const result: PackageJSON = {
    name: options.name,
    version: "0.0.1",
    private: true,
    scripts: {
      sc: "spicetify-creator",
      dev: "spicetify-creator dev",
      build: "spicetify-creator build",
    },
    dependencies: {},
    devDependencies: {
      "@spicetify/creator": env.isInternal ? "link:@spicetify/creator" : "latest",
    },
  };

  const slices: (PackageSlice | undefined)[] = [
    FRAMEWORKS[options.framework],
    LINTERS[options.linter],
  ];

  Object.values(INTERSECTIONS).forEach((intersection) => {
    if (intersection.condition(options)) {
      slices.push(intersection);
    }
  });

  slices.forEach((slice) => {
    if (!slice) return;

    for (const key of ["scripts", "dependencies", "devDependencies"] as const) {
      if (slice[key]) {
        result[key] = { ...result[key], ...slice[key] };
      }
    }
  });

  return result;
}

export function writePackageJSON(packageJSON: PackageJSON, targetDir: string): void {
  try {
    mkdirp(targetDir);
    const data = `${JSON.stringify(packageJSON, null, 2)}\n`;
    const filePath = join(targetDir, "package.json");
    writeFileSync(filePath, data, "utf8");
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    log.error(`Failed to write package.json: ${message}`);
    cancel("Exiting...");
    process.exit(1);
  }
}

export function validateProjectName(name: string) {
  if (!name.length) return "Project name is required";

  const nameRegExp = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

  if (!nameRegExp.test(name)) {
    return "Invalid project name (must be lowercase and URL-friendly)";
  }
}
