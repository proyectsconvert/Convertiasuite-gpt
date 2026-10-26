import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Key,
  LayoutDashboard,
  Plus,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../shared/services/api";

interface ApiKey {
  id: string;
  client_name: string;
  is_active: boolean;
  created_at: string;
}

interface ApiKeysResponse {
  status: string;
  api_keys: ApiKey[];
}

interface CreateApiKeyResponse {
  status: string;
  api_key_data: {
    api_key: string;
  };
}

interface ApiKeyActionResponse {
  status: string;
  message?: string;
}

const RAW_API_URL = import.meta.env.VITE_API_URL || "";
const API_URL =
  typeof window !== "undefined" && RAW_API_URL.includes("backend")
    ? ""
    : RAW_API_URL;
const ADMIN_BASE = `${API_URL}/admin`;
const API_KEYS_BASE = `${ADMIN_BASE}/api-keys`;

export const ApiKeysManager: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [newClientName, setNewClientName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchApiKeys = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiFetch<ApiKeysResponse>(API_KEYS_BASE);
      setApiKeys(response.api_keys ?? []);
    } catch (err: unknown) {
      console.error("Error al cargar las API Keys:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar las API Keys",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchApiKeys();
  }, [fetchApiKeys]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const clientName = newClientName.trim();
    if (!clientName || isCreating) return;

    try {
      setIsCreating(true);
      setError(null);
      setCopied(false);

      const response = await apiFetch<CreateApiKeyResponse>(API_KEYS_BASE, {
        method: "POST",
        body: JSON.stringify({ client_name: clientName }),
      });

      setNewlyCreatedKey(response.api_key_data.api_key);
      setNewClientName("");
      await fetchApiKeys();
    } catch (err: unknown) {
      console.error("Error al crear la API Key:", err);
      setError(
        err instanceof Error ? err.message : "Error al crear la API Key",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (revokingId) return;

    const confirmed = window.confirm(
      "¿Seguro que deseas revocar esta API Key? Los sistemas que la usen dejarán de tener acceso de inmediato.",
    );
    if (!confirmed) return;

    try {
      setRevokingId(id);
      setError(null);

      await apiFetch<ApiKeyActionResponse>(`${API_KEYS_BASE}/${id}`, {
        method: "DELETE",
      });

      await fetchApiKeys();
    } catch (err: unknown) {
      console.error("Error al revocar la API Key:", err);
      setError(
        err instanceof Error ? err.message : "Error al revocar la API Key",
      );
    } finally {
      setRevokingId(null);
    }
  };

  const copyToClipboard = async () => {
    if (!newlyCreatedKey) return;

    try {
      await navigator.clipboard.writeText(newlyCreatedKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch (err: unknown) {
      console.error("Error al copiar la API Key:", err);
      setError("No se pudo copiar la llave. Cópiala manualmente.");
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Cargando llaves...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4 text-foreground sm:p-6">
      <div className="mb-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={() => navigate("/app/admin")}
          className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard admin
        </button>

        <button
          type="button"
          onClick={() => navigate("/app/chat")}
          className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al chat
        </button>
      </div>

      <header className="mb-8">
        <h2 className="mb-2 flex items-center gap-2 text-2xl font-bold text-foreground">
          <Key className="h-6 w-6 text-primary" />
          API Keys
        </h2>
        <p className="text-muted-foreground">
          Gestiona las llaves de acceso para que sistemas externos (CRMs, bots,
          etc.) puedan conectarse a OlivIA.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {newlyCreatedKey && (
        <section className="mb-8 rounded-xl border border-green-300 bg-green-50 p-4 shadow-sm dark:border-green-900 dark:bg-green-950/30 sm:p-6">
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-green-900 dark:text-green-200">
            <CheckCircle2 className="h-5 w-5" />
            API Key generada con éxito
          </h3>
          <p className="mb-4 text-sm text-green-800 dark:text-green-300">
            Por seguridad, esta es la única vez que verás la llave completa.
            Cópiala y guárdala en un lugar seguro.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 break-all rounded border border-green-300 bg-white px-4 py-3 text-sm text-gray-800 dark:border-green-800 dark:bg-gray-950 dark:text-gray-100">
              {newlyCreatedKey}
            </code>
            <button
              type="button"
              onClick={() => void copyToClipboard()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-3 text-white transition-colors hover:bg-green-800"
            >
              {copied ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setNewlyCreatedKey(null);
              setCopied(false);
            }}
            className="mt-4 text-sm text-green-800 underline hover:text-green-950 dark:text-green-300 dark:hover:text-green-100"
          >
            Ya la he guardado, cerrar
          </button>
        </section>
      )}

      <section className="mb-8 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="border-b border-border bg-muted/50 p-5">
          <h3 className="font-semibold text-foreground">Generar nueva llave</h3>
        </div>

        <div className="p-5">
          <form
            onSubmit={handleCreate}
            className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-end"
          >
            <div className="min-w-0 flex-1">
              <label
                htmlFor="client-name"
                className="mb-1 block text-sm font-medium text-foreground"
              >
                Nombre del cliente o integración
              </label>
              <input
                id="client-name"
                type="text"
                placeholder="Ej. CRM Salesforce, Bot de WhatsApp..."
                value={newClientName}
                onChange={(event) => setNewClientName(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                maxLength={120}
                required
              />
            </div>

            <button
              type="submit"
              disabled={!newClientName.trim() || isCreating}
              className="flex h-[42px] items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2 font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {isCreating ? "Generando..." : "Generar llave"}
            </button>
          </form>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="border-b border-border bg-muted/50 p-5">
          <h3 className="font-semibold text-foreground">Llaves</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-sm text-muted-foreground">
                <th scope="col" className="p-4 font-medium">
                  Cliente / Integración
                </th>
                <th scope="col" className="p-4 font-medium">
                  Estado
                </th>
                <th scope="col" className="p-4 font-medium">
                  Fecha de creación
                </th>
                <th scope="col" className="p-4 text-right font-medium">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {apiKeys.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-8 text-center text-muted-foreground"
                  >
                    No hay API Keys generadas.
                  </td>
                </tr>
              ) : (
                apiKeys.map((apiKey) => (
                  <tr
                    key={apiKey.id}
                    className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/30"
                  >
                    <td className="p-4">
                      <div className="break-words font-medium text-foreground">
                        {apiKey.client_name}
                      </div>
                      <div className="mt-1 font-mono text-xs text-muted-foreground">
                        ID: {apiKey.id.split("-")[0]}...
                      </div>
                    </td>

                    <td className="p-4">
                      {apiKey.is_active ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-200">
                          Activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-200">
                          Revocada
                        </span>
                      )}
                    </td>

                    <td className="whitespace-nowrap p-4 text-sm text-muted-foreground">
                      {apiKey.created_at
                        ? new Date(apiKey.created_at).toLocaleDateString()
                        : "—"}
                    </td>

                    <td className="p-4 text-right">
                      {apiKey.is_active && (
                        <button
                          type="button"
                          onClick={() => void handleRevoke(apiKey.id)}
                          disabled={revokingId !== null}
                          title="Revocar acceso"
                          className="inline-flex items-center gap-1 rounded-lg p-2 text-sm text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>
                            {revokingId === apiKey.id
                              ? "Revocando..."
                              : "Revocar"}
                          </span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
