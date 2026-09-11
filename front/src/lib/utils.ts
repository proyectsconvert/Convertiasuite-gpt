import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normaliza y formatea el nombre de una posición o cargo laboral antes de enviarlo.
 * 
 * 1. Limpia espacios sobrantes al inicio, final y entre palabras.
 * 2. Compara de forma insensible a mayúsculas, minúsculas y acentos con las posiciones existentes.
 *    Si coincide con alguna posición ya registrada, retorna el texto exacto existente para evitar
 *    duplicidad en la base de datos.
 * 3. Si es una posición nueva, aplica formato Capital Case / Title Case inteligente, respetando
 *    conectores en minúscula (de, en, del, la, el, y, etc.) y siglas en mayúscula (QA, BI, IT, UX, UI, etc.).
 */
export function normalizePosition(
  input?: string | null,
  existingPositions: string[] = []
): string {
  if (!input) return "";

  // 1. Limpieza de espacios redundantes
  const cleaned = input.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";

  // 2. Normalización de caracteres (sin acentos y en minúsculas) para comparación segura
  const toCompareKey = (str: string) =>
    str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const targetKey = toCompareKey(cleaned);

  // 3. Buscar coincidencia con posiciones existentes (evita duplicados con variaciones de casing/tildes)
  const matched = existingPositions.find(
    (pos) => toCompareKey(pos) === targetKey
  );
  if (matched) {
    return matched.trim();
  }

  // 4. Formatear cargo nuevo (Capital Case + acrónimos + conectores)
  const minorWords = new Set([
    "de",
    "del",
    "la",
    "el",
    "y",
    "en",
    "para",
    "con",
    "a",
    "por",
    "al",
  ]);
  const acronyms = new Set([
    "it",
    "qa",
    "bi",
    "seo",
    "sem",
    "crm",
    "erp",
    "hr",
    "rh",
    "sst",
    "ux",
    "ui",
    "kam",
    "ai",
    "ia",
    "ml",
    "dev",
  ]);

  const words = cleaned.split(" ");
  const formattedWords = words.map((word, index) => {
    const wordLower = word.toLowerCase();
    if (acronyms.has(wordLower)) {
      return wordLower.toUpperCase();
    }
    if (index > 0 && minorWords.has(wordLower)) {
      return wordLower;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return formattedWords.join(" ");
}

/**
 * Normaliza y formatea el nombre de un departamento o área organizacional.
 */
export function normalizeArea(
  input?: string | null,
  existingAreas: string[] = []
): string {
  return normalizePosition(input, existingAreas);
}
