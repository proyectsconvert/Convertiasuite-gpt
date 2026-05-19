import { create } from "zustand";
import { persist } from "zustand/middleware";

import { SessionSummary, authApi } from "@/services/api";

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
  plan: "free" | "pro" | "enterprise";
  avatar?: string;
}

export interface ChatArtifact {
  id: string;
  title: string;
  type: "code" | "html" | "markdown" | "document";
  language?: string;
  content: string;
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
    id: string | null
  ) => void;

  setSessions: (
    sessions: SessionSummary[]
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

      setCurrentChatId: (id) =>
        set({ currentChatId: id }),

      setSessions: (sessions) =>
        set({ sessions }),

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
              plan: "pro",
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
        localStorage.removeItem(
          "accessToken"
        );

        localStorage.removeItem(
          "user"
        );

        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,

          sessions: [],
          currentChatId: null,

          view: "landing",
        });
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