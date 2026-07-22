import { create } from "zustand";
import { persist } from "zustand/middleware";

import { SessionSummary, authApi, ChatMessage, type DocumentArtifact, setTokenRefreshListener, documentsApi, clearSession } from "@/services/api";
import { extractAllArtifacts } from "@/lib/artifact-utils";

export type AppView =
  | "landing"
  | "auth"
  | "chat"
  | "settings";

export type AuthTab =
  | "login"
  | "register";

export interface User {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  area?: string;
  functional_role?: string;
  plan: "free" | "pro" | "enterprise";
  avatar?: string;
}

export interface ChatArtifact {
  id: string;
  messageId?: string;
  title: string;
  type: "code" | "html" | "markdown" | "document";
  language?: string;
  content: string;
  // Document-specific fields
  filename?: string;
  fileType?: "pdf" | "docx" | "pptx" | "csv" | "json" | "txt" | "file";
  downloadUrl?: string;
  timestamp?: string;
}

interface AppState {
  /* UI */
  view: AppView;
  authTab: AuthTab;
  sidebarOpen: boolean;
  chatSidebarOpen: boolean;
  darkMode: boolean;
  commandOpen: boolean;

  /* Auth */
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  /* Chat */
  currentChatId: string | null;
  sessions: SessionSummary[];
  messages: ChatMessage[];

  /* Models */
  selectedModel: string;

  /* Artifacts */
  artifactsPanelOpen: boolean;
  activeArtifact: ChatArtifact | null;

  /* Actions */
  setView: (view: AppView) => void;
  setAuthTab: (tab: AuthTab) => void;

  toggleSidebar: () => void;
  toggleChatSidebar: () => void;
  toggleDarkMode: () => void;
  setDarkMode: (darkMode: boolean) => void;

  setCurrentChatId: (
    id: string | null,
    clearMessages?: boolean,
  ) => void;

  setSessions: (
    sessions: SessionSummary[]
  ) => void;

  setMessages: (
    messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])
  ) => void;

  updateUser: (
    user: Partial<User>
  ) => void;

  addSession: (
    session: SessionSummary
  ) => void;

  deleteSession: (
    id: string
  ) => void;

  renameSession: (
    id: string,
    title: string
  ) => void;

  setCommandOpen: (
    open: boolean
  ) => void;

  setSelectedModel: (
    model: string
  ) => void;

  setArtifactsPanelOpen: (
    open: boolean
  ) => void;

  setActiveArtifact: (
    artifact: ChatArtifact | null
  ) => void;

  login: (
    email: string,
    password: string
  ) => Promise<boolean>;

  logout: () => void;

  generateDocumentAndAddArtifact: (
    filename: string,
    format: string,
    content: string | Record<string, unknown>,
    messageId?: string
  ) => Promise<ChatArtifact | null>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      /* INITIAL STATE */

      view: "landing",
      authTab: "login",

      sidebarOpen: true,
      chatSidebarOpen: true,

      darkMode: false,
      commandOpen: false,

      user: null,
      accessToken: null,
      isAuthenticated: false,

      currentChatId: null,
      sessions: [],
      messages: [],

      selectedModel: "qwen2.5:7b",

      artifactsPanelOpen: false,
      activeArtifact: null,

      /* UI ACTIONS */

      setView: (view) =>
        set({ view }),

      setAuthTab: (tab) =>
        set({ authTab: tab }),

      toggleSidebar: () =>
        set((state) => ({
          sidebarOpen: !state.sidebarOpen,
        })),

      toggleChatSidebar: () =>
        set((state) => ({
          chatSidebarOpen:
            !state.chatSidebarOpen,
        })),

      setCommandOpen: (open) =>
        set({ commandOpen: open }),

      setDarkMode: (darkMode) => {
        if (typeof document !== "undefined") {
          if (darkMode) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        }
        set({ darkMode });
      },

      toggleDarkMode: () =>
        set((state) => {
          const next = !state.darkMode;
          if (typeof document !== "undefined") {
            if (next) {
              document.documentElement.classList.add("dark");
            } else {
              document.documentElement.classList.remove("dark");
            }
          }
          return { darkMode: next };
        }),

      setSelectedModel: (model) =>
        set({ selectedModel: model }),

      /* CHAT */

      setCurrentChatId: (id, clearMessages = true) =>
        set((state) => ({
          currentChatId: id,
          messages: clearMessages ? [] : state.messages,
          activeArtifact: clearMessages ? null : state.activeArtifact,
          artifactsPanelOpen: clearMessages ? false : state.artifactsPanelOpen,
        })),

      setSessions: (sessions) =>
        set({ sessions }),

      setMessages: (messages) =>
        set((state) => ({
          messages: typeof messages === "function" ? messages(state.messages) : messages,
        })),

      updateUser: (updatedUser) =>
        set((state) => {
          if (!state.user) return {};
          const newUser = { ...state.user, ...updatedUser };
          localStorage.setItem("user", JSON.stringify(newUser));
          return { user: newUser };
        }),

      addSession: (session) =>
        set((state) => ({
          sessions: [
            session,
            ...state.sessions,
          ],
        })),

      deleteSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter(
            (s) => s.id !== id
          ),
          currentChatId:
            state.currentChatId === id
              ? null
              : state.currentChatId,
        })),

      renameSession: (
        id,
        title
      ) =>
        set((state) => ({
          sessions: state.sessions.map(
            (s) =>
              s.id === id
                ? { ...s, title }
                : s
          ),
        })),
    

      /* ARTIFACTS */

      setArtifactsPanelOpen: (
        open
      ) =>
        set({
          artifactsPanelOpen: open,
        }),

      setActiveArtifact: (
        artifact
      ) =>
        set({
          activeArtifact: artifact,
          artifactsPanelOpen:
            !!artifact,
        }),

      /* AUTH */

      login: async (
        email,
        password
      ) => {
        try {
          const response =
            await authApi.login({
              email,
              password,
            });

          localStorage.setItem(
            "accessToken",
            response.access_token
          );

          localStorage.setItem(
            "user",
            JSON.stringify(response.user)
          );

          set({
            user: {
              id: response.user.id,
              name: response.user.name,
              email:
                response.user.email,
              company: "Convert-IA",
              role: response.user.role,
              area: response.user.area,
              functional_role:
                response.user.functional_role,
              plan: "free",
            },
            accessToken:
              response.access_token,

            isAuthenticated: true,

            view: "chat",
          });

          return true;
        } catch (error) {
          console.error(
            "Login failed:",
            error
          );

          return false;
        }
      },

      logout: () => {
        clearSession();
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          sessions: [],
          currentChatId: null,
          view: "landing",
        });
        if (typeof window !== "undefined") {
          window.location.assign("/login");
        }
      },

      generateDocumentAndAddArtifact: async (
        filename,
        format,
        content,
        messageId
      ) => {
        try {
          const state = get();
          if (!state.currentChatId) {
            console.error(
              "No session ID available"
            );
            return null;
          }

          const response =
            await documentsApi.generateWithArtifact(
              filename,
              format,
              content,
              state.currentChatId,
              messageId
            );

          if (!response.success) {
            console.error(
              "Failed to generate document"
            );
            return null;
          }

          const artifact: ChatArtifact =
          {
            id:
              response.artifact.id,
            messageId:
              messageId ||
              state.messages.filter(
                (m) =>
                  m.role ===
                  "assistant"
              )[-1]?.id,
            title:
              response.artifact
                .filename,
            type: "document",
            filename:
              response.artifact
                .filename,
            fileType: (response.artifact.type as ChatArtifact["fileType"]),
            content: "",
            timestamp:
              response.artifact
                .created_at,
          };

          const documentArtifact: DocumentArtifact = {
            id: response.artifact.id,
            filename: response.artifact.filename,
            type: (response.artifact.type as DocumentArtifact["type"]) || "file",
            content: "",
            url: undefined,
          };

          // Add artifact to messages if message_id exists
          if (artifact.messageId) {
            set((state) => ({
              messages: state.messages.map((msg) =>
                msg.id === artifact.messageId
                  ? {
                    ...msg,
                    artifacts: [...(msg.artifacts || []), documentArtifact],
                  }
                  : msg
              ),
            }));
          }

          set({
            activeArtifact: artifact,
            artifactsPanelOpen:
              true,
          });

          return artifact;
        } catch (error) {
          console.error(
            "Error generating document:",
            error
          );
          return null;
        }
      },
    }),

    {
      name: "convertia-store",

      partialize: (state) => ({
        user: state.user,
        accessToken:
          state.accessToken,
        isAuthenticated:
          state.isAuthenticated,

        sessions: state.sessions,
        currentChatId:
          state.currentChatId,

        darkMode: state.darkMode,
        selectedModel:
          state.selectedModel,
      }),
    }
  )
);

setTokenRefreshListener((token) => {
  useAppStore.setState({ accessToken: token });
});

/**
 * Hook selector para obtener todos los artefactos del chat actual
 */
export const useCurrentChatArtifacts = () => {
  const { messages } = useAppStore();
  return extractAllArtifacts(messages);
};