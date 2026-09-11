# Convert-IA Suite (Convertiasuite-gpt)

Plataforma empresarial integral de inteligencia artificial conversacional, gestión de campañas, procesamiento RAG de documentos y asistencia inteligente para agentes en centros de contacto.

---

## 📐 Arquitectura General del Sistema

```
                        ┌─────────────────────────────────────────┐
                        │        Cliente Frontend (React)        │
                        │    Vite + TypeScript + TailwindCSS     │
                        └───────────────────┬─────────────────────┘
                                            │
                                    HTTP / SSE / WS
                                            │
                        ┌───────────────────▼─────────────────────┐
                        │        Backend Core (FastAPI)           │
                        │      Python 3.11 + Async Engine         │
                        └───────┬───────────────┬───────────────┬─┘
                                │               │               │
            ┌───────────────────▼──┐  ┌─────────▼────────┐  ┌───▼──────────────────┐
            │   Supabase Cloud     │  │   Redis Cache    │  │  Procesamiento RAG   │
            │ PostgreSQL / Auth /  │  │ Metrics, Buffer  │  │ Vector Engine (Vosk, │
            │      Storage         │  │   & Sessions     │  │ LangChain, ReportLab)│
            └──────────────────────┘  └──────────────────┘  └──────────────────────┘
```

---

## 🌟 Características Principales

### 1. 🤖 Chat Conversacional IA Avanzado
- **Streaming en tiempo real (SSE)**: Respuestas palabra por palabra impulsadas por Server-Sent Events.
- **Soporte multimodal**: Carga e inserción de contexto mediante documentos (PDF, DOCX, CSV, TXT) e imágenes (Vision models).
- **Gestión de artefactos**: Extracción y renderizado automático de artefactos (código, documentos generados, tablas).
- **Entrada y salida por voz**: Integración con modelo de reconocimiento de voz y saludo por síntesis de audio (`voice-greeting`).

### 2. 👩‍💼 Widget Agente "Olivia" (Asistente de Campaña)
- **Asistencia para agentes**: Widget interactivo disponible para consultar procedimientos, dudas de llamadas y errores operativos.
- **Acceso rápido**: Botón dedicado e integrado directamente en la barra de navegación principal izquierda (`ChatSidebar`).
- **Superposición flotante del sistema operativo (`Always-on-Top`)**: Integración con la API **Document Picture-in-Picture** (`documentPictureInPicture`), permitiendo mantener la ventana emergente flotando fijamente sobre WhatsApp, Excel, CRM u otros programas del escritorio.

### 3. 📄 Gestión de Documentos y Motor de Ingesta (RAG)
- **Generación de documentos**: Creación dinámica y exportación de archivos en formatos PDF, DOCX, PPTX, CSV y JSON.
- **Búsqueda y filtrado avanzado**: Búsqueda por texto libre, área, etiquetas, rango de fechas y tipo de archivo.
- **Historial de versiones**: Control de versiones y auditoría de documentos.

### 4. 📢 Gestión de Campañas (Admin / KAM)
- **Configuración de campañas**: Creación, administración de esquemas de precios, formatos de seguimiento y parámetros de plataforma.
- **Gestión de miembros**: Asignación de usuarios y roles dentro de cada campaña activa.

### 5. 📊 Panel de Administración y Métricas
- **Monitoreo en tiempo real**: Registro de consumo de tokens (input/output), solicitudes y costos desglosados por modelo, departamento, rol y usuario.
- **Gestión e invitación de usuarios**: Invitación y creación directa de usuarios con contraseña temporal o correo de verificación.

### 6. 🔒 Control de Acceso Basado en Roles (RBAC)
- **Admin**: Acceso completo a métricas globales, campañas, gestión de usuarios y configuraciones.
- **KAM**: Acceso a campañas asignadas, métricas de área y usuarios del equipo.
- **Agente / Usuario**: Interfaz simplificada enfocada en la atención conversacional y el widget de Olivia. En la sección de configuración se ocultan los campos de *Área* y *Rol Funcional*, además de restringir la modificación del perfil personal.

---

## 🛠️ Tecnologías Utilizadas

### Frontend (`/front`)
- **Core**: React 18, TypeScript, Vite.
- **Estilos**: Vanilla CSS / CSS Modules, TailwindCSS, Framer Motion (animaciones líquidas y glassmorphism), Lucide React (iconografía).
- **Gestión de Estado**: Zustand con persistencia en `localStorage` (`appStore.ts`).
- **Navegación & Formularios**: React Router DOM v6, Sonner (Toasts notificadores).

### Backend (`/back`)
- **Core**: FastAPI, Python 3.11, Uvicorn, Pydantic v2.
- **Base de Datos & Autenticación**: Supabase (PostgreSQL, Supabase Auth API, RLS).
- **Caché**: Redis (almacenamiento temporal de métricas y buffer de streams).
- **Voz & Documentos**: Vosk (reconocimiento offline), Edge-TTS, ReportLab (PDF), `python-docx`, `python-pptx`, Pandas.


## 🚀 Guía de Instalación y Ejecución

### Requisitos Previos
- **Node.js**: v18.0.0 o superior.
- **Python**: v3.10 o superior.
- **Redis**: Instancia local o remota en ejecución.

### 1. Configuración de Variables de Entorno

#### Backend (`/back/.env`)
```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
SUPABASE_JWT_SECRET=tu-jwt-secret
REDIS_HOST=localhost
REDIS_PORT=6379
FRONTEND_URL=http://localhost:5173
```

#### Frontend (`/front/.env`)
```env
VITE_API_URL=http://localhost:8000
```

### 2. Instalación de Dependencias

Desde el directorio raíz del proyecto:
```bash
# Instalar dependencias del frontend y backend simultáneamente
npm run install:all
```

O de forma independiente:
```bash
# Frontend
npm run install:front

# Backend
npm run install:back
```

### 3. Ejecución en Modo Desarrollo

#### Iniciar Frontend
```bash
npm run dev:front
# La aplicación se iniciará en http://localhost:5173
```

#### Iniciar Backend
```bash
npm run dev:back
# El servidor FastAPI se iniciará en http://localhost:8000 (Docs en http://localhost:8000/docs)
```

## 📜 Licencia y Derechos

Desarrollado para la suite empresarial **Convert-IA**. Todos los derechos reservados.
