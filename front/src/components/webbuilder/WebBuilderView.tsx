import { useMemo, useState } from "react";
import {
  Code,
  Eye,
  Monitor,
  Send,
  Smartphone,
  Sparkles,
  Tablet,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { webPromptPresets } from "@/lib/demo-data";

const initialCode = "";

export default function WebBuilderView() {
  const [prompt, setPrompt] = useState("");
  const [code, setCode] = useState(initialCode);
  const [mode, setMode] = useState<"code" | "preview" | "split">("split");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const previewWidth = useMemo(() => {
    if (device === "mobile") return "375px";
    if (device === "tablet") return "840px";
    return "100%";
  }, [device]);

  return (
    <div className="flex h-full flex-1 flex-col min-h-0">
      <header className="border-b border-border bg-card/80 px-5 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Prompt to website</p>
            <h1 className="text-lg font-semibold text-foreground">Web Builder Demo</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-secondary p-1">
              {[{ key: "code", icon: Code }, { key: "split", icon: Sparkles }, { key: "preview", icon: Eye }].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setMode(item.key as "code" | "preview" | "split")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                    mode === item.key ? "bg-background text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="mr-1 inline h-3.5 w-3.5" />
                  {item.key === "split" ? "Split" : item.key === "code" ? "Codigo" : "Preview"}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg bg-secondary p-1">
              {[{ key: "desktop", icon: Monitor }, { key: "tablet", icon: Tablet }, { key: "mobile", icon: Smartphone }].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setDevice(item.key as "desktop" | "tablet" | "mobile")}
                  className={`rounded-md p-1.5 ${device === item.key ? "bg-background text-foreground" : "text-muted-foreground"}`}
                >
                  <item.icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="border-b border-border bg-card px-5 py-3">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2">
          <div className="flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3">
              <Wand2 className="h-4 w-4 text-primary" />
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Describe el sitio que quieres generar para convertir leads enterprise"
                className="h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Button className="btn-primary-gradient gap-2">
              <Send className="h-3.5 w-3.5" /> Generar
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {webPromptPresets.map((preset) => (
              <button
                key={preset}
                onClick={() => setPrompt(preset)}
                className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="flex min-h-0 flex-1">
        {(mode === "code" || mode === "split") && (
          <section className={`${mode === "split" ? "w-1/2" : "w-full"} flex min-h-0 flex-col border-r border-border`}>
            <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-3 py-2">
              <span className="text-xs font-mono text-muted-foreground">index.html</span>
              <span className="text-xs text-muted-foreground">Editable</span>
            </div>
            <textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              spellCheck={false}
              className="min-h-0 flex-1 resize-none bg-card p-4 font-mono text-xs leading-relaxed text-foreground outline-none"
            />
          </section>
        )}

        {(mode === "preview" || mode === "split") && (
          <section className={`${mode === "split" ? "w-1/2" : "w-full"} min-h-0 overflow-auto bg-secondary/30 p-4`}>
            <div className="mx-auto rounded-xl border border-border bg-background shadow-card" style={{ width: previewWidth, maxWidth: "100%" }}>
              <iframe title="web-preview" srcDoc={code} sandbox="allow-scripts" className="h-[680px] w-full border-none" />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
