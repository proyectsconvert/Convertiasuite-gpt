import { ChatMessage } from "@/services/api";
import { ChatArtifact } from "@/store/appStore";


export function extractArtifactsFromMessage(
  message: ChatMessage
): ChatArtifact[] {
  const artifacts: ChatArtifact[] = [];

  const htmlBlockRegex = /```(?:html|markup|xml)\s*([\s\S]*?)```/gi;
  const htmlTagRegex = /<(?:!doctype|html|head|body|div|span|p|section|article|main|header|footer|nav|button|form|input|img|svg|canvas|script|style|link|table|tr|td|th|ul|ol|li|a|label|textarea)[^>]*>/i;
  const likelyHtmlSnippetRegex = /<!DOCTYPE html|<html[\s>]|<body[\s>]|<main[\s>]|<section[\s>]|<header[\s>]|<footer[\s>]/i;

  if (typeof message.content === "string") {
    let match: RegExpExecArray | null;
    while ((match = htmlBlockRegex.exec(message.content)) !== null) {
      const content = match[1]?.trim() || "";
      if (!content) continue;

      artifacts.push({
        id: `${message.id}-html-${artifacts.length}`,
        messageId: message.id,
        title: "Interfaz Web Generada (HTML)",
        type: "html",
        language: "html",
        content,
        timestamp: message.timestamp,
      });
    }

    const normalizedContent = message.content.trim();
    if (
      !artifacts.length &&
      normalizedContent &&
      (htmlTagRegex.test(normalizedContent) ||
        likelyHtmlSnippetRegex.test(normalizedContent))
    ) {
      artifacts.push({
        id: `${message.id}-html-direct`,
        messageId: message.id,
        title: "Interfaz Web Generada (HTML)",
        type: "html",
        language: "html",
        content: normalizedContent,
        timestamp: message.timestamp,
      });
    }
  }

  // Extraer documentos del campo artifacts (generados por el backend)
  if (message.artifacts && message.artifacts.length > 0) {
    message.artifacts.forEach((artifact, index) => {
      if (artifact.type === "html") {
        artifacts.push({
          id: `${message.id}-artifact-${index}`,
          messageId: message.id,
          title: artifact.filename || "Interfaz Web Generada",
          type: "html",
          language: "html",
          content: artifact.content || "",
          downloadUrl: artifact.url,
          timestamp: message.timestamp,
        });
      } else {
        const fileType = (artifact.type as ChatArtifact["fileType"]) || "file";

        artifacts.push({
          id: `${message.id}-artifact-${index}`,
          messageId: message.id,
          title: artifact.filename,
          type: "document",
          filename: artifact.filename,
          fileType,
          content: artifact.content || "",
          downloadUrl: artifact.url,
          timestamp: message.timestamp,
        });
      }
    });
  }

  // Extraer documentos de attachments (cargados por el usuario)
  if (message.attachments && message.attachments.length > 0) {
    message.attachments.forEach((attachment, index) => {
      const fileExt = attachment.filename
        .split(".")
        .pop()
        ?.toLowerCase() || "file";

      const fileTypeMap: Record<string, ChatArtifact["fileType"]> = {
        pdf: "pdf",
        docx: "docx",
        doc: "docx",
        pptx: "pptx",
        ppt: "pptx",
        csv: "csv",
        json: "json",
        txt: "txt",
      };

      const fileType = fileTypeMap[fileExt] || "file";

      artifacts.push({
        id: `${message.id}-attachment-${index}`,
        messageId: message.id,
        title: attachment.filename,
        type: "document",
        filename: attachment.filename,
        fileType,
        content: "", // Los documentos no tienen contenido de texto
        timestamp: message.timestamp,
      });
    });
  }

  return artifacts;
}

export function extractAllArtifacts(messages: ChatMessage[]): ChatArtifact[] {
  const allArtifacts: ChatArtifact[] = [];
  const seenIds = new Set<string>();

  messages.forEach((message) => {
    const messageArtifacts = extractArtifactsFromMessage(message);
    messageArtifacts.forEach((artifact) => {
      if (!seenIds.has(artifact.id)) {
        allArtifacts.push(artifact);
        seenIds.add(artifact.id);
      }
    });
  });

  return allArtifacts;
}


export function getArtifactCounts(artifacts: ChatArtifact[]): Record<string, number> {
  return {
    documents: artifacts.filter((a) => a.type === "document").length,
    html: artifacts.filter((a) => a.type === "html").length,
    code: artifacts.filter((a) => a.type === "code").length,
    markdown: artifacts.filter((a) => a.type === "markdown").length,
    total: artifacts.length,
  };
}

/**
 * Obtiene un icono/badge para mostrar el tipo de artefacto
 */
export function getArtifactTypeLabel(artifact: ChatArtifact): string {
  if (artifact.type === "document" && artifact.fileType) {
    return artifact.fileType.toUpperCase();
  }
  return artifact.type.toUpperCase();
}

/**
 * Filtra el razonamiento/thinking del contenido del mensaje
 * Solo muestra lo que es relevante para el usuario
 */
export function filterReasoningFromMessage(content: string): string {
  if (!content) return content;

  // Remover etiquetas de thinking/razonamiento
  let filtered = content
    // Remover <think>...</think> (Qwen)
    .replace(/<think>[\s\S]*?<\/think>\n*/gi, "")
    // Remover <thinking>...</thinking> (Claude/Others)
    .replace(/<thinking>[\s\S]*?<\/thinking>\n*/gi, "")
    // Remover <reasoning>...</reasoning>
    .replace(/<reasoning>[\s\S]*?<\/reasoning>\n*/gi, "")
    // Remover bloques de razonamiento en markdown con título y contenido hasta el siguiente salto de línea doble o el final
    .replace(/^\s*\*\*Razonamiento\*\*\s*[\r\n]+[\s\S]*?(?=\r?\n\r?\n|$)/gim, "")
    .replace(/^\s*##\s*Razonamiento\s*[\r\n]+[\s\S]*?(?=\r?\n\r?\n|$)/gim, "");

  // Limpiar múltiples saltos de línea
  filtered = filtered.replace(/\n\n\n+/g, "\n\n");

  return filtered.trim();
}

//Verifica si un mensaje es solo razonamiento (sin contenido útil)
export function isReasoningOnlyMessage(content: string): boolean {
  if (!content) return false;
  const originalTrimmed = content.trim();
  const cleaned = filterReasoningFromMessage(content).trim();

  // Solo ocultar mensajes que son realmente solo razonamiento/etiquetas sin contenido útil.
  return originalTrimmed.length > 0 && cleaned.length === 0;
}

export function normalizeChatContent(content: string): string {
  if (!content) return content;

  const cleaned = content
    .replace(/[\u200B-\u200F\uFEFF]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "\n\n")
    .replace(/\n/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  const lines = cleaned.split("\n");
  const meaningfulLines = lines.filter((line) => line.trim().length > 0);

  if (
    meaningfulLines.length > 1 &&
    meaningfulLines.every((line) => line.trim().length === 1)
  ) {
    return meaningfulLines.map((line) => line.trim()).join("");
  }

  // Detect space-separated single-letter tokens like "h o l a" and join them
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && tokens.length <= 20 && tokens.every((t) => t.length === 1)) {
    return tokens.join("");
  }

  return cleaned;
}

export function removeSystemExportJsonBlocks(content: string): string {
  if (!content) return content;

  let cleaned = content.replace(
    /<<<\s*SYSTEM[_ ]?EXPORT[_ ]?JSON\s*>>>[\s\S]*?<<<\s*END[_ ]?SYSTEM[_ ]?EXPORT[_ ]?JSON\s*>>>/gi,
    "",
  );

  cleaned = cleaned.replace(
    /<<<\s*SYSTEM[_ ]?EXPORT[_ ]?JSON\s*>>>[\s\S]*$/gi,
    "",
  );

  return cleaned.trim();
}

/**
 * Extrae solo la parte del documento eliminando charla conversacional inicial
 */
export function extractDocumentContent(content: string): string {
  if (!content) return content;

  // Primero remover bloques de sistema
  const cleaned = removeSystemExportJsonBlocks(content);

  // Patrones de conversación a eliminar
  const conversationalPatterns = [
    /¿te gustaría/gi,
    /¿necesitas/gi,
    /avísame si/gi,
    /si tienes/gi,
    /si requieres/gi,
    /si necesitas más detalles/gi,
    /si deseas/gi,
    /puedo ayudarte/gi,
    /aquí tienes/gi,
    /espero que/gi,
    /te proporciono/gi,
  ];

  // Eliminar líneas que son pura conversación
  let lines = cleaned.split('\n').filter(line => {
    const stripped = line.trim();
    if (!stripped) return true;
    // Líneas solo con símbolos: eliminar
    if (/^[\s•\-_*]+$/.test(stripped)) return false;
    // Líneas con conversación específica: eliminar
    return !conversationalPatterns.some(pattern => pattern.test(stripped));
  });

  // Convertir viñetas a texto normal
  lines = lines.map(line => {
    const stripped = line.trim();
    if (stripped.startsWith("• ")) return stripped.substring(2).trim();
    if (stripped.startsWith("- ") && !stripped.match(/^-{3,}/)) return stripped.substring(2).trim();
    if (stripped.startsWith("* ") && !stripped.startsWith("**")) return stripped.substring(2).trim();
    return line;
  });

  let result = lines.join('\n').trim();

  // Limpiar espacios excesivos
  result = result.replace(/\n{3,}/g, '\n\n');

  return result;
}

