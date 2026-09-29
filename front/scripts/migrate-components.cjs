/**
 * migrate-components.cjs
 * Mueve todos los archivos de src/components/ a src/modules/ según el mapeo
 * y luego actualiza todas las importaciones en el proyecto.
 *
 * Uso: node migrate-components.cjs
 */

const fs = require("fs");
const path = require("path");

const SRC = path.resolve(__dirname, "../src");
const COMPONENTS = path.join(SRC, "components");
const MODULES = path.join(SRC, "modules");

// ── Mapeo: carpeta en components/ → nueva ruta en modules/ ──────────────────
const MAPPING = {
  // Admin
  "admin":      "admin/components",
  "campaigns":  "admin/components",
  "qa":         "admin/components",

  // Agent
  "agents":     "agent/components",
  "voice":      "agent/components",

  // Shared
  "auth":       "shared/components/auth",
  "chat":       "shared/components/chat",
  "command":    "shared/components/command",
  "documents":  "shared/components/documents",
  "landing":    "shared/components/landing",
  "layout":     "shared/components/layout",
  "roomia":     "shared/components/roomia",
  "settings":   "shared/components/settings",
  "skills":     "shared/components/skills",
  "ui":         "shared/components/ui",
};

// ── Copiar archivos manteniendo estructura ───────────────────────────────────
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

let movedFiles = 0;
for (const [folder, target] of Object.entries(MAPPING)) {
  const srcDir = path.join(COMPONENTS, folder);
  const destDir = path.join(MODULES, target, folder === "ui" ? "" : "");

  if (!fs.existsSync(srcDir)) {
    console.log(`⚠️  No existe: components/${folder}`);
    continue;
  }

  // Para admin/campaigns/qa los copiamos directamente (sin sub-carpeta extra)
  const adminFolders = ["admin", "campaigns", "qa"];
  const agentFolders = ["agents", "voice"];
  let finalDest;

  if (adminFolders.includes(folder)) {
    finalDest = path.join(MODULES, "admin/components", folder);
  } else if (agentFolders.includes(folder)) {
    finalDest = path.join(MODULES, "agent/components", folder);
  } else if (folder === "ui") {
    finalDest = path.join(MODULES, "shared/components/ui");
  } else {
    finalDest = path.join(MODULES, "shared/components", folder);
  }

  copyDir(srcDir, finalDest);
  console.log(`✅ components/${folder} → modules/${path.relative(MODULES, finalDest)}`);
  movedFiles++;
}

console.log(`\n📦 ${movedFiles} carpetas copiadas a modules/`);

// ── Actualizar importaciones en todos los .ts/.tsx ──────────────────────────
const ALIAS_MAP = {
  // Admin
  "@/components/admin/":      "@/modules/admin/components/admin/",
  "@/components/campaigns/":  "@/modules/admin/components/campaigns/",
  "@/components/qa/":         "@/modules/admin/components/qa/",

  // Agent
  "@/components/agents/":     "@/modules/agent/components/agents/",
  "@/components/voice/":      "@/modules/agent/components/voice/",

  // Shared
  "@/components/auth/":       "@/modules/shared/components/auth/",
  "@/components/chat/":       "@/modules/shared/components/chat/",
  "@/components/command/":    "@/modules/shared/components/command/",
  "@/components/documents/":  "@/modules/shared/components/documents/",
  "@/components/landing/":    "@/modules/shared/components/landing/",
  "@/components/layout/":     "@/modules/shared/components/layout/",
  "@/components/roomia/":     "@/modules/shared/components/roomia/",
  "@/components/settings/":   "@/modules/shared/components/settings/",
  "@/components/skills/":     "@/modules/shared/components/skills/",
  "@/components/ui/":         "@/modules/shared/components/ui/",
  "@/store/appStore":         "@/modules/shared/store/appStore",
  "@/services/api":           "@/modules/shared/services/api",
  "@/services/voice":         "@/modules/shared/services/voice",
};

function walkFiles(dir, ext, callback) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.includes("node_modules") && !entry.name.includes(".git")) {
      walkFiles(full, ext, callback);
    } else if (entry.isFile() && (full.endsWith(".ts") || full.endsWith(".tsx"))) {
      callback(full);
    }
  }
}

let updatedFiles = 0;
walkFiles(SRC, [".ts", ".tsx"], (filePath) => {
  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;

  for (const [oldAlias, newAlias] of Object.entries(ALIAS_MAP)) {
    if (content.includes(oldAlias)) {
      content = content.split(oldAlias).join(newAlias);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, "utf8");
    updatedFiles++;
    console.log(`🔄 ${path.relative(SRC, filePath)}`);
  }
});

console.log(`\n✨ ${updatedFiles} archivos actualizados con nuevas rutas de importación.`);
console.log("\n⚠️  SIGUIENTE PASO: Verificar con 'npm run build' que no haya errores.");
