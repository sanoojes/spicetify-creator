import { gzipSync } from "node:zlib";
import { pc } from "@/utils/common";
import { logger } from "@/utils/logger";
import type { BuildCache } from "@/esbuild";
import { relative } from "node:path";

export function formatBuildSummary(files: BuildCache["files"]): string {
  try {
    const tableData = [];
    let totalSize = 0;

    for (const [filePath, file] of files) {
      let gzipKB = 0;
      if (file.contents) {
        const gzipped = gzipSync(file.contents);
        gzipKB = gzipped.length / 1024;
      }

      const sizeKB = file.contents.length / 1024;
      totalSize += file.contents.length;

      tableData.push({
        fullPath: relative(process.cwd(), filePath),
        sizeKB,
        gzipKB,
      });
    }

    const maxPathWidth = Math.max(...tableData.map((d) => d.fullPath.length), 10);
    const lines: string[] = [];

    for (const file of tableData) {
      const sizeColor = file.sizeKB > 500 ? pc.magenta : file.sizeKB > 100 ? pc.yellow : pc.cyan;

      const pathPart = pc.dim(file.fullPath);
      const padding = " ".repeat(maxPathWidth - file.fullPath.length + 2);

      const sizeStr = `${file.sizeKB.toFixed(2)} kB`.padStart(9);
      const gzipStr = pc.dim(`│ gzip: ${file.gzipKB.toFixed(2).padStart(5)} kB`);

      lines.push(`${pc.blue("i")} ${pathPart}${padding}${sizeColor(sizeStr)} ${gzipStr}`);
    }

    const totalSizeKB = totalSize / 1024;
    const fileCount = tableData.length;

    lines.push(
      `${pc.blue("ℹ")} ${pc.bold(
        pc.gray(`${fileCount} files, total: ${totalSizeKB.toFixed(2)} kB`),
      )}`,
    );

    return lines.join("\n");
  } catch (e) {
    logger.debug(e);
    return pc.red("Failed to generate build summary");
  }
}
