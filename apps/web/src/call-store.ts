import { create } from "zustand";

type CallMode = "video" | "text";
type CallStatus =
  "preview" | "connecting" | "connected" | "reconnecting" | "ended";

interface CallUiState {
  mode: CallMode;
  status: CallStatus;
  audioEnabled: boolean;
  videoEnabled: boolean;
  chatOpen: boolean;
  setMode: (mode: CallMode) => void;
  setStatus: (status: CallStatus) => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleChat: () => void;
}

export const useCallUi = create<CallUiState>((set) => ({
  mode: "video",
  status: "preview",
  audioEnabled: true,
  videoEnabled: true,
  chatOpen: true,
  setMode: (mode) => set({ mode, videoEnabled: mode === "video" }),
  setStatus: (status) => set({ status }),
  toggleAudio: () => set((state) => ({ audioEnabled: !state.audioEnabled })),
  toggleVideo: () =>
    set((state) =>
      state.mode === "video" ? { videoEnabled: !state.videoEnabled } : state,
    ),
  toggleChat: () => set((state) => ({ chatOpen: !state.chatOpen })),
}));
