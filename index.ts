import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * Rewrite Markdown links and images.
 *
 * Links:
 *   [Label](Destination) -> Label Destination
 *
 * Images:
 *   ![Alt](Destination) -> ![Alt](Destination)\n\nDestination
 */
function rewriteLinks(text: string, cwd: string, colorDestination: (destination: string) => string, colorLabel: (label: string) => string): string {
  let fence: string | undefined;
  return text.split(/(?<=\n)/).map((line) => {
    const marker = line.match(/^[ \t]*(`{3,}|~{3,})([^\r\n]*)/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && marker[2].trim() === "") {
        fence = undefined;
      }
      return line;
    }
    if (marker && !(marker[1][0] === "`" && marker[2].includes("`"))) {
      fence = marker[1];
      return line;
    }
    return rewriteLine(line, cwd, colorDestination, colorLabel);
  }).join("");
}

function rewriteLine(text: string, cwd: string, colorDestination: (destination: string) => string, colorLabel: (label: string) => string): string {
  return text.replace(
    /(!?)\[([^\]\n]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
    (_match, image: string, label: string, destination: string) => {
      if (
        destination.startsWith("./") ||
        destination.startsWith("../") ||
        (destination.startsWith("/") && !destination.startsWith("//"))
      ) {
        destination = pathToFileURL(resolve(cwd, destination)).href;
      }

      if (image === "!") {
        // Preserve the image and append its destination.
        return `![${label}](${destination})\n\n${colorDestination(destination)}`;
      }

      // Show both the label and destination without Markdown link rendering.
      return `${colorLabel(label)} ${colorDestination(destination)}`;
    },
  );
}

export default function (pi: ExtensionAPI) {
  pi.on("message_end", async (event, ctx) => {
    if (event.message.role !== "assistant") return;

    let changed = false;

    const content = event.message.content.map((block) => {
      if (block.type !== "text") return block;

      const rewritten = rewriteLinks(
        block.text,
        ctx.cwd,
        (destination) => ctx.mode === "tui" ? ctx.ui.theme.fg("mdCode", destination) : destination,
        (label) => ctx.mode === "tui" ? ctx.ui.theme.fg("mdHeading", label) : label,
      );

      if (rewritten === block.text) return block;

      changed = true;
      return { ...block, text: rewritten };
    });

    if (!changed) return;

    return {
      message: {
        ...event.message,
        content,
      },
    };
  });
}
