import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Search,
  Filter,
  History,
  Tag,
  CalendarRange,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { documentsApi } from "@/services/api";
import { toast } from "sonner";

interface DocumentItem {
  id: string;
  filename: string;
  type: string;
  word_count: number;
  created_at: string;
  updated_at: string;
  tags: string[];
  metadata: Record<string, unknown>;
  preview_text: string;
  version: number;
  history: Array<{
    version?: number;
    action?: string;
    timestamp?: string;
    summary?: string;
  }>;
}

interface DocumentDetails extends DocumentItem {
  sections: string[];
}

export default function DocumentsView() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTags, setUploadTags] = useState("");

  const availableTags = useMemo(() => {
    const values = new Set<string>();
    documents.forEach((doc) => doc.tags.forEach((tag) => values.add(tag)));
    return Array.from(values).sort();
  }, [documents]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await documentsApi.listDocuments({
        search: search || undefined,
        type: typeFilter || undefined,
        tag: tagFilter || undefined,
        area: areaFilter || undefined,
        user: userFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setDocuments(response.documents || []);
      if (!response.documents?.length) {
        setSelectedDocument(null);
      }
    } catch (error) {
      console.error("Error loading documents", error);
      toast.error("No se pudieron cargar los documentos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDocuments();
  }, [search, typeFilter, tagFilter, areaFilter, userFilter, dateFrom, dateTo]);

  const handleUpload = async () => {
    if (!selectedFile) return;

    const tags = uploadTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    setUploading(true);
    try {
      await documentsApi.uploadFile(selectedFile, tags);
      toast.success(`Documento subido: ${selectedFile.name}`);
      setSelectedFile(null);
      setUploadTags("");
      const input = document.getElementById(
        "document-upload",
      ) as HTMLInputElement | null;
      if (input) input.value = "";
      await loadDocuments();
    } catch (error) {
      console.error(error);
      toast.error("No se pudo subir el documento");
    } finally {
      setUploading(false);
    }
  };

  const handleSelectDocument = async (documentId: string) => {
    const current = documents.find((item) => item.id === documentId);
    if (!current) return;

    setSelectedDocument(null);
    try {
      const details = await documentsApi.getById(documentId);
      setSelectedDocument(details);
    } catch (error) {
      console.error(error);
      setSelectedDocument({ ...current, sections: [] });
    }
  };

  const handleDelete = async (documentId: string) => {
    const confirmed = window.confirm("¿Eliminar este documento?");
    if (!confirmed) return;

    try {
      await documentsApi.delete(documentId);
      toast.success("Documento eliminado");
      setDocuments((prev) => prev.filter((item) => item.id !== documentId));
      if (selectedDocument?.id === documentId) {
        setSelectedDocument(null);
      }
    } catch (error) {
      console.error(error);
      toast.error("No se pudo eliminar el documento");
    }
  };

  const handleDownload = async (documentId: string, filename: string) => {
    try {
      const blob = await documentsApi.download(documentId);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      window.URL.revokeObjectURL(url);
      toast.success("Descarga iniciada");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo descargar el documento");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">
              Gestión documental
            </p>
            <h1 className="text-2xl font-semibold">
              Documentos, historial y vistas previas
            </h1>
            <p className="text-sm text-muted-foreground">
              Sube archivos, filtra por tipo o fecha, revisa versiones y
              descarga lo que necesites.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4 text-primary" />
            Historial personal
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="h-5 w-5" /> Subir documento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                id="document-upload"
                type="file"
                onChange={(event) =>
                  setSelectedFile(event.target.files?.[0] || null)
                }
              />
              <Input
                placeholder="Etiquetas separadas por coma"
                value={uploadTags}
                onChange={(event) => setUploadTags(event.target.value)}
              />
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? "Subiendo..." : "Subir documento"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Los archivos quedan guardados en tu historial personal con
                versión y seguimiento.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" /> Buscar y filtrar
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="relative sm:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nombre, texto o etiqueta"
                  className="pl-9"
                />
              </div>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option value="">Todos los tipos</option>
                <option value="pdf">PDF</option>
                <option value="docx">DOCX</option>
                <option value="excel">Excel</option>
                <option value="txt">TXT</option>
                <option value="csv">CSV</option>
                <option value="md">Markdown</option>
                <option value="json">JSON</option>
              </select>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={tagFilter}
                onChange={(event) => setTagFilter(event.target.value)}
              >
                <option value="">Todas las etiquetas</option>
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Filtrar por área"
                value={areaFilter}
                onChange={(event) => setAreaFilter(event.target.value)}
              />
              <Input
                placeholder="Filtrar por usuario"
                value={userFilter}
                onChange={(event) => setUserFilter(event.target.value)}
              />
              <div className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </div>
              <Input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="min-h-[360px]">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Documentos
                </span>
                <Badge variant="secondary">{documents.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">
                  Cargando documentos...
                </p>
              ) : documents.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Aún no hay archivos en tu historial. Sube uno para comenzar.
                </div>
              ) : (
                documents.map((document) => (
                  <div
                    key={document.id}
                    className={`rounded-lg border p-3 transition-colors ${selectedDocument?.id === document.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        className="flex-1 text-left"
                        onClick={() => handleSelectDocument(document.id)}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="font-medium">
                            {document.filename}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">{document.type}</Badge>
                          <span>{document.word_count} palabras</span>
                          <span>
                            {new Date(document.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </button>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            handleDownload(document.id, document.filename)
                          }
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(document.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {document.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {document.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[11px]"
                          >
                            <Tag className="mr-1 h-3 w-3" /> {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {document.preview_text && (
                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                        {document.preview_text}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="min-h-[360px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5" /> Vista previa y versión
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDocument ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Selecciona un documento para ver su previsualización,
                  metadatos y historial.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="font-semibold">
                        {selectedDocument.filename}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Versión {selectedDocument.version}
                      </p>
                    </div>
                    <Badge variant="outline">{selectedDocument.type}</Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-3 text-sm">
                      <p className="font-medium">Metadatos</p>
                      <p className="mt-1 text-muted-foreground">
                        Palabras: {selectedDocument.word_count}
                      </p>
                      <p className="text-muted-foreground">
                        Creado:{" "}
                        {new Date(selectedDocument.created_at).toLocaleString()}
                      </p>
                      <p className="text-muted-foreground">
                        Actualizado:{" "}
                        {new Date(selectedDocument.updated_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 text-sm">
                      <p className="font-medium">Etiquetas</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedDocument.tags.length > 0 ? (
                          selectedDocument.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">
                            Sin etiquetas
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-3 text-sm">
                    <p className="mb-2 font-medium">Vista previa</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      {selectedDocument.preview_text ||
                        "Sin contenido de previsualización disponible."}
                    </p>
                  </div>

                  <div className="rounded-lg border p-3 text-sm">
                    <p className="mb-2 font-medium">Historial de cambios</p>
                    {selectedDocument.history?.length ? (
                      <ul className="space-y-2">
                        {selectedDocument.history.map((entry, idx) => (
                          <li
                            key={`${entry.timestamp || idx}-${idx}`}
                            className="rounded border p-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">
                                {entry.action ||
                                  `Versión ${entry.version || idx + 1}`}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {entry.timestamp
                                  ? new Date(entry.timestamp).toLocaleString()
                                  : ""}
                              </span>
                            </div>
                            {entry.summary && (
                              <p className="mt-1 text-muted-foreground">
                                {entry.summary}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">
                        Todavía no hay historial registrado.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
