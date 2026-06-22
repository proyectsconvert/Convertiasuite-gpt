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
    // Remover <thinking>...</thinking>
    .replace(/<thinking>[\s\S]*?<\/thinking>\n*/g, "")
    // Remover <reasoning>...</reasoning>
    .replace(/<reasoning>[\s\S]*?<\/reasoning>\n*/g, "")
    // Remover bloques de razonamiento en markdown
    .replace(/\*\*Razonamiento[\s\S]*?\*\*\n*/g, "")
    .replace(/## Razonamiento[\s\S]*?\n\n/g, "");

  // Limpiar múltiples saltos de línea
  filtered = filtered.replace(/\n\n\n+/g, "\n\n");

  return filtered.trim();
}

//Verifica si un mensaje es solo razonamiento (sin contenido útil)
export function isReasoningOnlyMessage(content: string): boolean {
  if (!content) return false;
  const cleaned = filterReasoningFromMessage(content);
  return cleaned.length < 10;
}

