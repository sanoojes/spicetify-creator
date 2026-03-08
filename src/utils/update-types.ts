import { logger } from "@/utils/logger";
import { log, spinner } from "@clack/prompts";
import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";

type Download = {
  from: string;
  to: string;
  action?: (content: string) => string | Promise<string>;
};

const downloads: Record<string, Download> = {
  spicetify: {
    from: "https://raw.githubusercontent.com/spicetify/cli/main/globals.d.ts",
    to: "./src/types/spicetify.d.ts",
    action: (content) =>
      content
        .replace("const React: any;", 'const React: typeof import("react");')
        .replace("const ReactDOM: any;", 'const ReactDOM: typeof import("react-dom/client");')
        .replace(
          "const ReactDOMServer: any;",
          'const ReactDOMServer: typeof import("react-dom/server");',
        ),
  },
};

export async function updateTypes(isUpdating = true, cwd: string = process.cwd()) {
  const s = spinner();

  s.start(`${isUpdating ? "Updating" : "Creating"} Types...`);

  await Promise.all(
    Object.entries(downloads).map(([name, download]) =>
      downloadFile(name, download, isUpdating, cwd),
    ),
  );

  s.stop(`${isUpdating ? "Updated" : "Created"} Types!`);
}

async function downloadFile(
  name: string,
  { from, to, action }: Download,
  isUpdating: boolean,
  cwd: string,
) {
  try {
    const res = await fetch(from);
    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
    }

    let text = await res.text();

    if (action) {
      text = await action(text);
    }

    const fullPath = join(cwd, to);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, text, "utf8");

    const actionLog = isUpdating ? "updated" : "created";
    logger.log(`${name}.d.ts ${actionLog} (${from} -> ${fullPath})`);
  } catch (e) {
    log.error(`${name} failed`);
    console.error(e);
  }
}
