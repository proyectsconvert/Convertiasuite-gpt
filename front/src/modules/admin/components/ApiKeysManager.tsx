import React, { useState, useEffect } from "react";
import { Plus, Trash2, Key, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { apiFetch } from "../../shared/services/api";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { useNavigate } from "react-router-dom";

const RAW_API_URL = import.meta.env.VITE_API_URL || "";
const API_URL = typeof window !== "undefined" && RAW_API_URL.includes("backend") ? "" : RAW_API_URL;
const ADMIN_BASE = `${API_URL}/admin`;
const API_KEYS_BASE = `${ADMIN_BASE}/api-keys`;

export const ApiKeysManager: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newClientName, setNewClientName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<{ status: string; api_keys: any[] }>(API_KEYS_BASE);
      setApiKeys(res.api_keys || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error al cargar las API Keys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    try {
      setError(null);
      const res = await apiFetch<{ status: string; api_key_data: any }>(API_KEYS_BASE, {
        method: "POST",
        body: JSON.stringify({ client_name: newClientName }),
      });
      setNewlyCreatedKey(res.api_key_data.api_key);
      setNewClientName("");
      fetchApiKeys(); // Recargar la lista
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error al crear la API Key");
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas revocar esta API Key? Los sistemas que la usen dejarán de tener acceso de inmediato.")) return;

    try {
      await apiFetch<{ status: string; message: string }>(`${API_KEYS_BASE}/${id}`, {
        method: "DELETE",
      });
      fetchApiKeys();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error al revocar la API Key");
    }
  };

  const copyToClipboard = () => {
    if (newlyCreatedKey) {
      navigator.clipboard.writeText(newlyCreatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando llaves...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto text-foreground">
      {/* Navegación */}
      <div className="flex flex-wrap justify-end gap-3 mb-6">
        <button
          onClick={() => navigate("/app/admin")}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary border border-border transition-colors"
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard admin
        </button>

        <button
          onClick={() => navigate("/app/chat")}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary border border-border transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al chat
        </button>
      </div>

      {/* Encabezado */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Key className="w-6 h-6 text-primary" />
          API Keys
        </h2>
        <p className="text-muted-foreground">
          Gestiona las llaves de acceso para que sistemas externos
          (CRMs, bots, etc.) puedan conectarse a OlivIA.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {newlyCreatedKey && (
        <div className="mb-8 bg-green-50 border border-green-200 p-6 rounded-xl shadow-sm">
          <h3 className="text-green-800 font-semibold mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            ¡API Key generada con éxito!
          </h3>
          <p className="text-green-700 text-sm mb-4">
            Por seguridad, esta es la única vez que verás la llave completa. Cópiala y guárdala en un lugar seguro.
          </p>
          <div className="flex items-center gap-2">
            <code className="bg-white px-4 py-2 rounded border border-green-300 text-gray-800 flex-1 overflow-x-auto">
              {newlyCreatedKey}
            </code>
            <button
              onClick={copyToClipboard}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <button
            onClick={() => setNewlyCreatedKey(null)}
            className="mt-4 text-sm text-green-700 hover:text-green-900 underline"
          >
            Ya la he guardado, cerrar
          </button>
        </div>
      )}

      <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="p-5 border-b border-border bg-muted/50 flex justify-between items-center">
          <h3 className="font-semibold text-foreground">
            Generar Nueva Llave
          </h3>
        </div>
        <div className="p-5">
          <form onSubmit={handleCreate} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-1">
                Nombre del Cliente o Integración
              </label>
              <input
                type="text"
                placeholder="Ej. CRM Salesforce, Bot de WhatsApp..."
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                className="w-full px-4 py-2 bg-background text-foreground placeholder:text-muted-foreground border border-border rounded-lg focus:ring-2 focus:ring-ring outline-none transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={!newClientName.trim()}
              className="bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors h-[42px]"
            >
              <Plus className="w-4 h-4" />
              Generar Llave
            </button>
          </form>
        </div>
      </div>

      <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border bg-muted/50">
          <h3 className="font-semibold text-foreground">
            Llaves Activas
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-sm border-b border-border">
                <th className="p-4 font-medium">Cliente / Integración</th>
                <th className="p-4 font-medium">Estado</th>
                <th className="p-4 font-medium">Fecha de Creación</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    No hay API Keys generadas.
                  </td>
                </tr>
              ) : (
                apiKeys.map((key) => (
                  <tr key={key.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-gray-800">{key.client_name}</div>
                      <div className="text-xs text-gray-400 font-mono mt-1">ID: {key.id.split('-')[0]}...</div>
                    </td>
                    <td className="p-4">
                      {key.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Revocada
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {new Date(key.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      {key.is_active && (
                        <button
                          onClick={() => handleRevoke(key.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors inline-flex items-center gap-1 text-sm"
                          title="Revocar acceso"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Revocar</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
