import { create } from "zustand";

interface UiState {
    sidebarOpen: boolean;
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;
    theme: "light" | "dark" | "system";
    setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useUiStore = create<UiState>((set) => ({
    sidebarOpen: true,
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    theme: "system",
    setTheme: (theme) => set({ theme }),
}));
