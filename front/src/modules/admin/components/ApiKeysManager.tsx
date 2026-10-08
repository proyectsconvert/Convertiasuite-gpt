import React, { useState, useEffect } from "react";
import { Plus, Trash2, Key, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { apiFetch } from "../../shared/services/api";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const ApiKeysManager: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newClientName, setNewClientName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{status: string; api_keys: any[]}>(
        `${import.meta.env.VITE_API_URL || ""}/admin/api-keys`
      );
      setApiKeys(res.api_keys || []);
    } catch (err: any) {
      console.error(err);
      setError("Error al cargar las API Keys");
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
      const res = await apiFetch<{status: string; api_key_data: any}>(
        `${import.meta.env.VITE_API_URL || ""}/admin/api-keys`,
        {
          method: "POST",
          body: JSON.stringify({ client_name: newClientName }),
        }
      );
      setNewlyCreatedKey(res.api_key_data.api_key);
      setNewClientName("");
      fetchApiKeys(); // Recargar la lista
    } catch (err: any) {
      console.error(err);
      setError("Error al crear la API Key");
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas revocar esta API Key? Los sistemas que la usen dejarán de tener acceso de inmediato.")) return;
    
    try {
      await apiFetch<{status: string; message: string}>(
        `${import.meta.env.VITE_API_URL || ""}/admin/api-keys/${id}`,
        { method: "DELETE" }
      );
      fetchApiKeys();
    } catch (err: any) {
      console.error(err);
      setError("Error al revocar la API Key");
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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Key className="w-6 h-6 text-indigo-600" />
          API Keys (Integraciones Externas)
        </h2>
        <p className="text-gray-600">
          Gestiona las llaves de acceso para que sistemas externos (CRMs, Bots, etc.) puedan conectarse a OlivIA.
        </p>

        <button
              onClick={() => navigate("/app/chat")}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/80 border border-border transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver al chat
            </button>
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

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">Generar Nueva Llave</h3>
        </div>
        <div className="p-5">
          <form onSubmit={handleCreate} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Cliente o Integración
              </label>
              <input
                type="text"
                placeholder="Ej. CRM Salesforce, Bot de WhatsApp..."
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={!newClientName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors h-[42px]"
            >
              <Plus className="w-4 h-4" />
              Generar Llave
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-800">Llaves Activas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-gray-500 text-sm border-b border-gray-100">
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
