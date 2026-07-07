import { describe, expect, it } from "vitest";
import { extractArtifactsFromMessage, isReasoningOnlyMessage, removeSystemExportJsonBlocks } from "./artifact-utils";

describe("extractArtifactsFromMessage", () => {
    it("detects HTML content even when it is not wrapped in a fenced code block", () => {
        const message = {
            id: "msg-1",
            role: "assistant" as const,
            content: `<div style="padding: 24px"><h1>Hola</h1><p>Vista previa</p></div>`,
            timestamp: "2026-06-18T00:00:00.000Z",
        };

        const artifacts = extractArtifactsFromMessage(message as any);

        expect(artifacts).toHaveLength(1);
        expect(artifacts[0].type).toBe("html");
        expect(artifacts[0].content).toContain("<h1>Hola</h1>");
    });
});

describe("isReasoningOnlyMessage", () => {
    it("returns false for short user content that is not reasoning", () => {
        expect(isReasoningOnlyMessage("Hola")).toBe(false);
        expect(isReasoningOnlyMessage("Sí")).toBe(false);
    });

    it("returns true only when all content is reasoning metadata or tags", () => {
        expect(isReasoningOnlyMessage("<think>Procesando...</think>")).toBe(true);
        expect(isReasoningOnlyMessage("**Razonamiento**\n¿Por qué?\n")).toBe(true);
    });
});
