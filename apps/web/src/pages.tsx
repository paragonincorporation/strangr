import { useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  Avatar,
  Badge,
  Button,
  Card,
  Dialog,
  IconButton,
  Input,
  Select,
  Textarea,
  ToastRegion,
} from "@paramingle/ui";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { api, supabase, useAuth } from "./auth.js";
import { useCallUi } from "./call-store.js";
import { RouteState } from "./components/route-state.js";
import { MediaManager } from "./media.js";
import { RealtimeClient } from "./realtime-client.js";

export function LandingPage() {
  return (
    <main className="landing" id="main-content">
      <section className="landing-hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span>01</span> FAST TO MEET. DELIBERATE TO KEEP.
          </p>
          <h1 aria-label="Meet on Paramingle.">
            MEET ON
            <br />
            <em>PARAMINGLE.</em>
          </h1>
          <p className="hero-lede">
            One tap to meet. Mutual consent to stay connected.
          </p>
          <div className="hero-actions">
            <Link className="hero-primary" to="/auth/sign-in">
              Create your account <b>↗</b>
            </Link>
            <Link className="hero-secondary" to="/conversation/video">
              Preview the call room <span>→</span>
            </Link>
          </div>
          <ul className="principles" aria-label="Paramingle principles">
            <li>16+ accounts</li>
            <li>Age-safe cohorts</li>
            <li>Block anytime</li>
            <li>No recordings</li>
          </ul>
        </div>
        <div className="hero-art" aria-label="A future connection preview">
          <div className="identity-card identity-card--back">
            <span>ENCOUNTER</span>
            <strong>48H</strong>
          </div>
          <div className="identity-card identity-card--front">
            <Badge tone="success">READY TO MEET</Badge>
            <div className="mystery-avatar">?</div>
            <strong>YOU HAVEN’T MET YET.</strong>
            <p>Keep talking only if both of you choose it.</p>
          </div>
          <div className="hero-sticker">
            MEET
            <br />
            STRANGERS.
            <br />
            KEEP
            <br />
            FRIENDS.
          </div>
        </div>
      </section>
      <section className="landing-safety" aria-labelledby="safety-title">
        <p className="eyebrow">BUILT INTO THE LOOP</p>
        <h2 id="safety-title">Safety isn’t a modal at the end.</h2>
        <div className="safety-grid">
          <Card>
            <b>01</b>
            <h3>Age-safe matching</h3>
            <p>16–17 and adult matching stay strictly separate.</p>
          </Card>
          <Card>
            <b>02</b>
            <h3>Clear exits</h3>
            <p>Skip, leave, report, and block stay close at hand.</p>
          </Card>
          <Card>
            <b>03</b>
            <h3>Mutual connections</h3>
            <p>A stranger becomes a friend only after acceptance.</p>
          </Card>
        </div>
      </section>
    </main>
  );
}

export function AuthPage() {
  const [mode, setMode] = useState<"sign_in" | "sign_up" | "reset">("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) {
      setMessage("Authentication is not configured for this environment.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/auth/sign-in`,
        });
        if (error) throw error;
        setMessage("Check your email for a password reset link.");
      } else if (mode === "sign_up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${location.origin}/auth/sign-in` },
        });
        if (error) throw error;
        setMessage("Check your email to verify your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        const target = params.get("returnTo");
        void navigate(
          target?.startsWith("/") && !target.startsWith("//") ? target : "/app",
        );
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };
  const google = async () => {
    if (!supabase) {
      setMessage("Authentication is not configured.");
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/app` },
    });
  };
  return (
    <main className="auth-page" id="main-content">
      <Card className="auth-card">
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h1>Come meet someone new.</h1>
        <p className="muted">
          Verified accounts keep matching and contact revocable.
        </p>
        <form onSubmit={(event) => void submit(event)}>
          <Input
            autoComplete="email"
            label="Email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
          {mode !== "reset" ? (
            <Input
              autoComplete="current-password"
              label="Password"
              placeholder="At least 10 characters"
              type="password"
              minLength={10}
              onChange={(e) => setPassword(e.target.value)}
              required
              value={password}
            />
          ) : null}
          <Button disabled={busy} fullWidth type="submit">
            {busy
              ? "Please wait…"
              : mode === "sign_up"
                ? "Create account"
                : mode === "reset"
                  ? "Send reset link"
                  : "Sign in"}
          </Button>
        </form>
        {message ? <p role="status">{message}</p> : null}
        <Button
          onClick={() => setMode(mode === "sign_in" ? "sign_up" : "sign_in")}
          variant="quiet"
        >
          {mode === "sign_in" ? "Create an account" : "Back to sign in"}
        </Button>
        <Button onClick={() => setMode("reset")} variant="quiet">
          Forgot password?
        </Button>
        <div className="auth-divider">
          <span>or</span>
        </div>
        <Button onClick={() => void google()} fullWidth variant="secondary">
          Continue with Google
        </Button>
        <Link className="auth-next" to="/onboarding">
          Preview onboarding →
        </Link>
      </Card>
    </main>
  );
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const [birthDate, setBirthDate] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isPrivate, setPrivate] = useState(true);
  const [accept, setAccept] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await api("/v1/me/onboarding", {
        method: "POST",
        body: JSON.stringify({ step: "birth_date", birthDate }),
      });
      await api("/v1/me/onboarding", {
        method: "POST",
        body: JSON.stringify({
          step: "policies",
          termsVersion: "beta-2026-07",
          guidelinesVersion: "beta-2026-07",
        }),
      });
      await api("/v1/me/onboarding", {
        method: "POST",
        body: JSON.stringify({
          step: "profile",
          username,
          displayName,
          isPrivate,
        }),
      });
      await api("/v1/me/onboarding", {
        method: "POST",
        body: JSON.stringify({
          step: "preferences",
          discoverableByUsername: true,
          allowEncounterRequests: true,
          showPresence: true,
          showRecentActivity: false,
          retainEncounterHistory: true,
          reducedMotion: false,
          highContrast: false,
        }),
      });
      void navigate("/app");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-page" id="main-content">
      <Card className="auth-card onboarding-card">
        <div className="onboarding-progress">
          <span />
          <span />
          <span />
        </div>
        <p className="eyebrow">ONE-TIME SETUP</p>
        <h1>Identity without forced exposure.</h1>
        <p className="muted">
          Your exact birthday stays encrypted and private. The server derives
          your matching cohort.
        </p>
        <form onSubmit={(event) => void submit(event)}>
          <Input
            label="Date of birth"
            onChange={(e) => setBirthDate(e.target.value)}
            required
            type="date"
            value={birthDate}
          />
          <Input
            label="Username"
            onChange={(e) => setUsername(e.target.value)}
            pattern="[A-Za-z0-9_]{3,30}"
            placeholder="yourname"
            required
            value={username}
          />
          <Input
            label="Display name"
            onChange={(e) => setDisplayName(e.target.value)}
            required
            value={displayName}
          />
          <Select
            defaultValue="private"
            label="Starting profile visibility"
            onChange={(e) => setPrivate(e.target.value === "private")}
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </Select>
          <label>
            <input
              checked={accept}
              onChange={(e) => setAccept(e.target.checked)}
              type="checkbox"
            />{" "}
            I accept the Terms and Community Guidelines.
          </label>
          <Button disabled={!accept || busy} fullWidth type="submit">
            Continue safely
          </Button>
        </form>
        {message ? <p role="alert">{message}</p> : null}
      </Card>
    </main>
  );
}

type DirectThread = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  unread: number;
};
type DirectMessage = {
  id: string;
  senderId: string;
  sequence: number;
  body: string | null;
  sentAt: string;
  deletedAt: string | null;
};

export function MessagesPage() {
  const [threads, setThreads] = useState<DirectThread[]>([]);
  const [selected, setSelected] = useState<DirectThread>();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("Loading conversations…");
  const [callActive, setCallActive] = useState(false);
  const [incoming, setIncoming] = useState<{
    callId: string;
    callerId: string;
    mode: "voice" | "video";
  }>();
  const realtime = useRef<RealtimeClient | null>(null);
  const selectedRef = useRef<string | undefined>(undefined);
  const directCallId = useRef<string | undefined>(undefined);
  const directInitiator = useRef(false);
  const directStream = useRef<MediaStream | null>(null);
  const directPeer = useRef<RTCPeerConnection | null>(null);
  const localDirectVideo = useRef<HTMLVideoElement>(null);
  const remoteDirectVideo = useRef<HTMLVideoElement>(null);
  const stopCall = () => {
    directStream.current?.getTracks().forEach((track) => track.stop());
    directStream.current = null;
    directPeer.current?.close();
    directPeer.current = null;
    directCallId.current = undefined;
    setCallActive(false);
    if (localDirectVideo.current) localDirectVideo.current.srcObject = null;
    if (remoteDirectVideo.current) remoteDirectVideo.current.srcObject = null;
  };
  const peerForCall = async () => {
    if (directPeer.current) return directPeer.current;
    const { iceServers } = await api<{ iceServers: RTCIceServer[] }>(
      "/v1/rtc/credentials",
      { method: "POST" },
    );
    const peer = new RTCPeerConnection({ iceServers });
    directStream.current
      ?.getTracks()
      .forEach((track) => peer.addTrack(track, directStream.current!));
    peer.ontrack = (event) => {
      if (remoteDirectVideo.current)
        remoteDirectVideo.current.srcObject = event.streams[0] ?? null;
    };
    peer.onicecandidate = (event) => {
      if (event.candidate && directCallId.current)
        realtime.current?.send("call.rtc.ice", {
          callId: directCallId.current,
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
        });
    };
    directPeer.current = peer;
    return peer;
  };
  const receiveCallRtc = async (event: {
    type: string;
    payload: Record<string, unknown>;
  }) => {
    if (String(event.payload.callId) !== directCallId.current) return;
    const peer = await peerForCall();
    if (event.type === "call.rtc.ice") {
      await peer.addIceCandidate({
        candidate: String(event.payload.candidate),
        sdpMid: event.payload.sdpMid as string | null,
        sdpMLineIndex: event.payload.sdpMLineIndex as number | null,
      });
      return;
    }
    await peer.setRemoteDescription({
      type: event.type === "call.rtc.offer" ? "offer" : "answer",
      sdp: String(event.payload.sdp),
    });
    if (event.type === "call.rtc.offer") {
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      realtime.current?.send("call.rtc.answer", {
        callId: directCallId.current,
        sdp: answer.sdp ?? "",
      });
    }
  };
  const loadThreads = async () => {
    const response = await api<{ items: DirectThread[] }>("/v1/threads");
    setThreads(response.items);
    setSelected((current) => current ?? response.items[0]);
    setStatus(response.items.length ? "" : "No friend conversations yet.");
  };
  const loadMessages = async (thread: DirectThread) => {
    const response = await api<{ items: DirectMessage[] }>(
      `/v1/threads/${thread.id}/messages`,
    );
    setMessages(response.items);
    const last = response.items.at(-1);
    if (last)
      await api(`/v1/threads/${thread.id}/read`, {
        method: "PUT",
        body: JSON.stringify({ sequence: last.sequence }),
      });
  };
  useEffect(() => {
    // Initial route hydration is intentionally owned by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadThreads().catch((error) =>
      setStatus(
        error instanceof Error ? error.message : "Could not load messages",
      ),
    );
  }, []);
  useEffect(() => {
    selectedRef.current = selected?.id;
    // The selected server entity controls the recoverable message page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (selected) void loadMessages(selected);
  }, [selected]);
  useEffect(() => {
    const client = new RealtimeClient(
      (raw) => {
        const event = raw as { type: string; payload: Record<string, unknown> };
        if (event.type === "message.created") {
          const payload = event.payload as unknown as {
            threadId: string;
            message: DirectMessage;
          };
          if (payload.threadId === selectedRef.current)
            setMessages((items) =>
              items.some((item) => item.id === payload.message.id)
                ? items
                : [...items, payload.message].sort(
                    (a, b) => a.sequence - b.sequence,
                  ),
            );
          void loadThreads();
        } else if (event.type === "message.deleted") {
          const id = String(event.payload.messageId);
          setMessages((items) =>
            items.map((item) =>
              item.id === id
                ? {
                    ...item,
                    body: null,
                    deletedAt: String(event.payload.deletedAt),
                  }
                : item,
            ),
          );
        } else if (event.type === "call.invite")
          setIncoming({
            callId: String(event.payload.callId),
            callerId: String(event.payload.callerId),
            mode: event.payload.mode as "voice" | "video",
          });
        else if (event.type === "call.connecting") {
          setStatus("Call connecting…");
          if (directInitiator.current)
            void peerForCall().then(async (peer) => {
              const offer = await peer.createOffer();
              await peer.setLocalDescription(offer);
              realtime.current?.send("call.rtc.offer", {
                callId: directCallId.current!,
                sdp: offer.sdp ?? "",
              });
            });
        } else if (
          event.type === "call.rtc.offer" ||
          event.type === "call.rtc.answer" ||
          event.type === "call.rtc.ice"
        )
          void receiveCallRtc(event);
        else if (event.type.startsWith("call.")) {
          setStatus(event.type.replace("call.", "Call "));
          stopCall();
        }
      },
      (connection) => {
        if (connection === "reconnecting") setStatus("Reconnecting…");
      },
    );
    realtime.current = client;
    void client
      .connect()
      .catch(() =>
        setStatus("Realtime unavailable; messages will recover on refresh."),
      );
    return () => {
      client.stop();
      stopCall();
    };
    // This subscription owns the call/media lifecycle for the route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !draft.trim()) return;
    const body = draft.trim();
    setDraft("");
    try {
      const message = await api<DirectMessage>(
        `/v1/threads/${selected.id}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ clientMessageId: crypto.randomUUID(), body }),
        },
      );
      setMessages((items) =>
        items.some((item) => item.id === message.id)
          ? items
          : [...items, message],
      );
    } catch (error) {
      setDraft(body);
      setStatus(error instanceof Error ? error.message : "Message failed");
    }
  };
  const call = async (mode: "voice" | "video") => {
    if (!selected) return;
    try {
      directStream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === "video",
      });
      const result = await api<{ callId: string }>("/v1/calls/direct", {
        method: "POST",
        body: JSON.stringify({ friendId: selected.userId, mode }),
      });
      directCallId.current = result.callId;
      setCallActive(true);
      directInitiator.current = true;
      if (localDirectVideo.current)
        localDirectVideo.current.srcObject = directStream.current;
      setStatus(`${mode === "video" ? "Video" : "Voice"} call ringing…`);
    } catch (error) {
      stopCall();
      setStatus(error instanceof Error ? error.message : "Call unavailable");
    }
  };
  const answer = async (action: "accept" | "reject") => {
    if (!incoming) return;
    if (action === "accept") {
      directStream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incoming.mode === "video",
      });
      directCallId.current = incoming.callId;
      setCallActive(true);
      directInitiator.current = false;
      if (localDirectVideo.current)
        localDirectVideo.current.srcObject = directStream.current;
    }
    await api(`/v1/calls/direct/${incoming.callId}/actions`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
    setStatus(action === "accept" ? "Call connecting…" : "Call declined.");
    setIncoming(undefined);
    if (action === "reject") stopCall();
  };
  return (
    <div className="page-stack">
      <header className="page-heading">
        <div>
          <p className="eyebrow">KEEP TALKING</p>
          <h1>Messages</h1>
          <p>Plain-text conversations with current friends.</p>
        </div>
      </header>
      {incoming ? (
        <Card role="alert">
          <strong>Incoming {incoming.mode} call</strong>
          <div className="hero-actions">
            <Button onClick={() => void answer("accept")}>Accept</Button>
            <Button onClick={() => void answer("reject")} variant="danger">
              Decline
            </Button>
          </div>
        </Card>
      ) : null}
      <div className="friends-layout">
        <Card>
          <h2>Conversations</h2>
          {threads.map((thread) => (
            <Button
              key={thread.id}
              onClick={() => setSelected(thread)}
              variant={selected?.id === thread.id ? "primary" : "quiet"}
            >
              {thread.displayName}
              {thread.unread ? ` (${thread.unread})` : ""}
            </Button>
          ))}
        </Card>
        <Card>
          <header>
            <h2>{selected?.displayName ?? "Choose a conversation"}</h2>
            {selected ? (
              <div>
                <Button
                  onClick={() => void call("voice")}
                  size="small"
                  variant="secondary"
                >
                  Voice call
                </Button>{" "}
                <Button
                  onClick={() => void call("video")}
                  size="small"
                  variant="secondary"
                >
                  Video call
                </Button>
              </div>
            ) : null}
          </header>
          <div className="call-preview-row">
            <video autoPlay muted playsInline ref={localDirectVideo} />
            <video autoPlay playsInline ref={remoteDirectVideo} />
          </div>
          {callActive ? (
            <div className="hero-actions">
              <Button
                onClick={() => {
                  directStream.current
                    ?.getAudioTracks()
                    .forEach((track) => (track.enabled = !track.enabled));
                }}
                size="small"
                variant="secondary"
              >
                Toggle mute
              </Button>
              <Button
                onClick={() => {
                  directStream.current
                    ?.getVideoTracks()
                    .forEach((track) => (track.enabled = !track.enabled));
                }}
                size="small"
                variant="secondary"
              >
                Toggle camera
              </Button>
              <Button
                onClick={() => {
                  if (directCallId.current)
                    realtime.current?.send("call.end", {
                      callId: directCallId.current,
                    });
                  stopCall();
                }}
                size="small"
                variant="danger"
              >
                End call
              </Button>
            </div>
          ) : null}
          <div aria-live="polite" className="message-list">
            {messages.map((message) => (
              <p className="message" key={message.id}>
                {message.body ?? "Message deleted"}
              </p>
            ))}
          </div>
          <form
            className="message-compose"
            onSubmit={(event) => void send(event)}
          >
            <Input
              disabled={!selected}
              label="Message"
              maxLength={2000}
              onChange={(event) => setDraft(event.target.value)}
              value={draft}
            />
            <Button disabled={!selected || !draft.trim()} type="submit">
              Send
            </Button>
          </form>
          <p role="status">{status}</p>
        </Card>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState("");
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/v1/profiles/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName, bio, status }),
      });
      await api("/v1/profiles/me/visibility", {
        method: "PATCH",
        body: JSON.stringify({
          fields: {
            avatar: "everyone",
            bio: "friends",
            age_band: "encounters",
            interests: "encounters",
            language: "encounters",
            region: "friends",
            online_state: "friends",
            recent_activity: "friends",
          },
        }),
      });
      setMessage("Profile and visibility saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const init = await api<{ uploadId: string; uploadUrl: string }>(
        "/v1/me/avatar-uploads",
        {
          method: "POST",
          body: JSON.stringify({ byteSize: file.size, contentType: file.type }),
        },
      );
      await api(init.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "content-type": file.type },
      });
      await api("/v1/me/avatar-uploads/finalize", {
        method: "POST",
        body: JSON.stringify({ uploadId: init.uploadId }),
      });
      setMessage("Avatar updated.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-stack">
      <header className="page-heading">
        <div>
          <p className="eyebrow">YOUR IDENTITY</p>
          <h1>Profile</h1>
          <p>Only processed raster images become visible.</p>
        </div>
      </header>
      <Card>
        <form onSubmit={(event) => void save(event)}>
          <Input
            label="Display name"
            onChange={(e) => setDisplayName(e.target.value)}
            required
            value={displayName}
          />
          <Textarea
            label="Bio"
            maxLength={500}
            onChange={(e) => setBio(e.target.value)}
            value={bio}
          />
          <Input
            label="Status"
            maxLength={80}
            onChange={(e) => setStatus(e.target.value)}
            value={status}
          />
          <Button disabled={busy} type="submit">
            Save profile
          </Button>
        </form>
        <Input
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          label="Avatar image (max 5 MB)"
          onChange={(event) => void upload(event)}
          type="file"
        />
        <p role="status">{busy ? "Scanning and processing…" : message}</p>
      </Card>
    </div>
  );
}

export function SettingsPage() {
  const { session } = useAuth();
  const [message, setMessage] = useState("");
  const [sessions, setSessions] = useState<
    Array<{ id: string; deviceLabel: string | null; lastSeenAt: string }>
  >([]);
  const load = async () => {
    try {
      setSessions(await api("/v1/me/sessions"));
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Could not load sessions",
      );
    }
  };
  const revoke = async (id: string) => {
    await api(`/v1/me/sessions/${id}`, { method: "DELETE" });
    await load();
  };
  const signOut = async () => {
    await supabase?.auth.signOut();
    setMessage("Signed out.");
  };
  return (
    <div className="page-stack">
      <header className="page-heading">
        <div>
          <p className="eyebrow">YOUR CONTROLS</p>
          <h1>Settings</h1>
          <p>{session?.user.email}</p>
        </div>
      </header>
      <Card>
        <h2>Privacy and sessions</h2>
        <p>
          Discoverability, encounter requests, presence, recent activity,
          accessibility, and history are initialized with onboarding and
          enforced by the API.
        </p>
        <Button onClick={() => void signOut()} variant="secondary">
          Sign out
        </Button>
        <Button onClick={() => void load()} variant="quiet">
          Load signed-in devices
        </Button>
        <ul>
          {sessions.map((item) => (
            <li key={item.id}>
              {item.deviceLabel ?? "Unknown browser"} ·{" "}
              {new Date(item.lastSeenAt).toLocaleDateString()}{" "}
              <Button
                onClick={() => void revoke(item.id)}
                size="small"
                variant="danger"
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
        <p role="status">{message}</p>
      </Card>
    </div>
  );
}

export function HomePage() {
  return (
    <div className="page-stack">
      <header className="page-heading">
        <div>
          <p className="eyebrow">READY WHEN YOU ARE</p>
          <h1>Meet someone new.</h1>
        </div>
        <Badge tone="accent">Account shell</Badge>
      </header>
      <section className="mode-grid" aria-label="Random matching modes">
        <Card className="mode-card mode-card--video">
          <Badge>VIDEO</Badge>
          <h2>Face to face.</h2>
          <p>
            Camera and microphone are requested only after you choose video.
          </p>
          <Link to="/conversation/video">
            Start video matching <span>↗</span>
          </Link>
        </Card>
        <Card className="mode-card mode-card--text">
          <Badge>TEXT</Badge>
          <h2>Words first.</h2>
          <p>Start without media or switch when permissions are unavailable.</p>
          <Link to="/conversation/text">
            Start text matching <span>↗</span>
          </Link>
        </Card>
      </section>
      <section className="home-columns">
        <div>
          <div className="section-heading">
            <h2>Recent encounters</h2>
            <Link to="/app/history">View history</Link>
          </div>
          <RouteState kind="empty" />
        </div>
        <Card className="safety-card">
          <p className="eyebrow">QUICK SAFETY</p>
          <h2>You’re always in control.</h2>
          <p>
            Report keeps the conversation open unless you choose to leave. Block
            ends contact immediately.
          </p>
          <Button variant="secondary">Review community rules</Button>
        </Card>
      </section>
    </div>
  );
}

export function PlaceholderPage({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-stack">
      <header className="page-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </header>
      <RouteState kind="empty" />
    </div>
  );
}

type EncounterItem = {
  id: string;
  mode: "text" | "video";
  startedAt: string;
  otherUser: {
    id: string;
    username: string;
    displayName: string;
    avatarAvailable: boolean;
  };
};
export function HistoryPage() {
  const [items, setItems] = useState<EncounterItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">(
    supabase ? "loading" : "ready",
  );
  useEffect(() => {
    if (!supabase) return;
    void api<{ items: EncounterItem[] }>("/v1/encounters?window=48h")
      .then((result) => {
        setItems(result.items);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);
  if (state === "loading") return <RouteState kind="loading" />;
  if (state === "error") return <RouteState kind="error" />;
  return (
    <div className="page-stack">
      <header className="page-heading">
        <div>
          <p className="eyebrow">RECENT ENCOUNTERS</p>
          <h1>History</h1>
          <p>
            Visible for up to 48 hours. A block hides the encounter immediately.
          </p>
        </div>
      </header>
      {items.length === 0 ? (
        <RouteState kind="empty" />
      ) : (
        <section className="card-grid">
          {items.map((item) => (
            <Card key={item.id}>
              <Avatar name={item.otherUser.displayName} />
              <h2>{item.otherUser.displayName}</h2>
              <p>
                @{item.otherUser.username} · {item.mode} ·{" "}
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(item.startedAt))}
              </p>
              <div className="button-row">
                <Button
                  onClick={() =>
                    void api("/v1/friend-requests", {
                      method: "POST",
                      body: JSON.stringify({
                        userId: item.otherUser.id,
                        encounterId: item.id,
                      }),
                    }).then(() =>
                      setItems((current) =>
                        current.filter((x) => x.id !== item.id),
                      ),
                    )
                  }
                  variant="secondary"
                >
                  Add friend
                </Button>
                <Link
                  to={`/app/people/${encodeURIComponent(item.otherUser.username)}`}
                >
                  View profile
                </Link>
                <Button
                  variant="quiet"
                  onClick={() =>
                    void api(`/v1/encounters/${item.id}/view`, {
                      method: "DELETE",
                    }).then(() =>
                      setItems((current) =>
                        current.filter((x) => x.id !== item.id),
                      ),
                    )
                  }
                >
                  Hide
                </Button>
                <Button
                  variant="danger"
                  onClick={() =>
                    void api("/v1/blocks", {
                      method: "POST",
                      body: JSON.stringify({
                        userId: item.otherUser.id,
                        reasonCategory: "safety",
                      }),
                    }).then(() =>
                      setItems((current) =>
                        current.filter((x) => x.id !== item.id),
                      ),
                    )
                  }
                >
                  Block
                </Button>
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}

type FriendItem = {
  id: string;
  user: { id: string; username: string; displayName: string };
  presence: "online" | "hidden";
};
type RequestItem = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  expiresAt: string;
};
export function FriendsPage() {
  const navigate = useNavigate();
  const [lookup, setLookup] = useState("");
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">(
    supabase ? "loading" : "ready",
  );
  const load = async () => {
    const [friendResult, requestResult] = await Promise.all([
      api<{ items: FriendItem[] }>("/v1/friends"),
      api<{ items: RequestItem[] }>("/v1/friend-requests"),
    ]);
    setFriends(friendResult.items);
    setRequests(requestResult.items);
    setState("ready");
  };
  useEffect(() => {
    if (supabase) {
      void Promise.resolve()
        .then(load)
        .catch(() => setState("error"));
      const timer = window.setInterval(
        () => void load().catch(() => undefined),
        30_000,
      );
      return () => window.clearInterval(timer);
    }
    return undefined;
  }, []);
  const act = (id: string, action: "accept" | "reject") =>
    void api(`/v1/friend-requests/${id}/actions`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }).then(load);
  if (state === "loading") return <RouteState kind="loading" />;
  if (state === "error") return <RouteState kind="error" />;
  return (
    <div className="page-stack">
      <header className="page-heading">
        <div>
          <p className="eyebrow">SOCIAL CIRCLE</p>
          <h1>Friends</h1>
          <p>
            Requests require mutual consent. Presence is shown only when a
            friend permits it.
          </p>
        </div>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const exact = lookup.trim();
          if (/^[A-Za-z0-9_]{3,30}$/.test(exact))
            void navigate(`/app/people/${encodeURIComponent(exact)}`);
        }}
      >
        <Input
          label="Find exact username"
          value={lookup}
          onChange={(event) => setLookup(event.target.value)}
          maxLength={30}
        />
        <Button type="submit">View profile</Button>
      </form>
      <section>
        <h2>Requests {requests.length ? `(${requests.length})` : ""}</h2>
        {requests.length === 0 ? (
          <p>No incoming requests.</p>
        ) : (
          requests.map((request) => (
            <Card key={request.id}>
              <h3>{request.displayName}</h3>
              <p>@{request.username}</p>
              <div className="button-row">
                <Button onClick={() => act(request.id, "accept")}>
                  Accept
                </Button>
                <Button
                  variant="quiet"
                  onClick={() => act(request.id, "reject")}
                >
                  Reject
                </Button>
              </div>
            </Card>
          ))
        )}
      </section>
      <section>
        <h2>Your friends</h2>
        {friends.length === 0 ? (
          <RouteState kind="empty" />
        ) : (
          <div className="card-grid">
            {friends.map((friend) => (
              <Card key={friend.id}>
                <Avatar
                  name={friend.user.displayName}
                  {...(friend.presence === "online"
                    ? { status: "online" as const }
                    : {})}
                />
                <h3>{friend.user.displayName}</h3>
                <p>
                  @{friend.user.username} ·{" "}
                  {friend.presence === "online" ? "Online" : "Presence hidden"}
                </p>
                <div className="button-row">
                  <Link
                    to={`/app/people/${encodeURIComponent(friend.user.username)}`}
                  >
                    Profile
                  </Link>
                  <Button
                    variant="quiet"
                    onClick={() =>
                      void api(`/v1/mutes/${friend.user.id}`, {
                        method: "PUT",
                        body: JSON.stringify({ scope: "all" }),
                      })
                    }
                  >
                    Mute
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() =>
                      void api(`/v1/friends/${friend.id}`, {
                        method: "DELETE",
                      }).then(load)
                    }
                  >
                    Unfriend
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function OtherProfilePage() {
  const { username = "" } = useParams();
  const validUsername = /^[A-Za-z0-9_]{3,30}$/.test(username);
  const [profile, setProfile] = useState<{
    username: string;
    displayName: string;
    bio: string;
    interests: string[];
    isPrivate: boolean;
  }>();
  const [error, setError] = useState(false);
  useEffect(() => {
    if (supabase && validUsername)
      void api<typeof profile>(`/v1/profiles/${encodeURIComponent(username)}`)
        .then(setProfile)
        .catch(() => setError(true));
  }, [username, validUsername]);
  if (error || !validUsername) return <RouteState kind="forbidden" />;
  if (!profile) return <RouteState kind="loading" />;
  return (
    <div className="page-stack">
      <Card>
        <Avatar name={profile.displayName} />
        <p className="eyebrow">
          {profile.isPrivate ? "PRIVATE PROFILE" : "PROFILE"}
        </p>
        <h1>{profile.displayName}</h1>
        <p>@{profile.username}</p>
        {profile.bio && <p>{profile.bio}</p>}
        <p>{profile.interests.join(" · ")}</p>
      </Card>
    </div>
  );
}

export function ConversationPage() {
  const { mode: routeMode } = useParams();
  const [searchParams] = useSearchParams();
  const permissionDenied = searchParams.get("permission") === "denied";
  const call = useCallUi();
  const mode =
    permissionDenied || routeMode === "text" || call.mode === "text"
      ? "text"
      : "video";
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("harassment");
  const [reportNote, setReportNote] = useState("");
  const [blockOpen, setBlockOpen] = useState(false);
  const [toast, setToast] = useState<string>();
  const [matchId, setMatchId] = useState<string>();
  const [peerId, setPeerId] = useState<string>();
  const matchIdRef = useRef<string | undefined>(undefined);
  const [messages, setMessages] = useState<
    Array<{ id: string; text: string; mine: boolean }>
  >([]);
  const [draft, setDraft] = useState("");
  const [permissionError, setPermissionError] = useState(permissionDenied);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const media = useRef(new MediaManager());
  const peer = useRef<RTCPeerConnection | null>(null);
  const realtime = useRef<RealtimeClient | null>(null);
  useEffect(() => {
    let active = true;
    const client = new RealtimeClient(
      (raw) => {
        const event = raw as { type: string; payload: Record<string, unknown> };
        if (event.type === "match.found") {
          const id = String(event.payload.matchId);
          matchIdRef.current = id;
          setMatchId(id);
          setPeerId(String(event.payload.peerId));
          call.setStatus("connecting");
          client.send("match.ack", { matchId: id });
          if (event.payload.initiator === true && mode === "video")
            void createOffer(id);
        } else if (event.type === "match.connected")
          call.setStatus("connected");
        else if (event.type === "match.ended") {
          teardown();
          call.setStatus("ended");
          setToast("The encounter ended.");
        } else if (event.type === "chat.message")
          setMessages((items) => [
            ...items,
            {
              id: String(event.payload.sequence),
              text: String(event.payload.text),
              mine: false,
            },
          ]);
        else if (
          event.type === "rtc.offer" ||
          event.type === "rtc.answer" ||
          event.type === "rtc.ice"
        )
          void receiveRtc(event);
      },
      (status) => call.setStatus(status),
    );
    realtime.current = client;
    const start = async () => {
      if (mode === "video")
        try {
          const stream = await media.current.acquire();
          if (localVideo.current) localVideo.current.srcObject = stream;
        } catch {
          if (active) {
            setPermissionError(true);
            call.setMode("text");
          }
        }
      await client.connect();
      client.send("match.join", {
        mode: permissionError ? "text" : mode,
        allowPreferenceRelaxation: false,
      });
    };
    void start().catch((error) =>
      setToast(
        error instanceof Error ? error.message : "Could not start matching",
      ),
    );
    return () => {
      active = false;
      client.stop();
      teardown();
    };
    // The encounter owns these resources for the route lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ensurePeer() {
    if (peer.current) return peer.current;
    const credentials = await api<{ iceServers: RTCIceServer[] }>(
      "/v1/rtc/credentials",
      {
        method: "POST",
      },
    );
    const connection = new RTCPeerConnection({
      iceServers: credentials.iceServers,
    });
    media.current.stream
      ?.getTracks()
      .forEach((track) => connection.addTrack(track, media.current.stream!));
    connection.ontrack = (event) => {
      if (remoteVideo.current)
        remoteVideo.current.srcObject = event.streams[0] ?? null;
    };
    connection.onicecandidate = (event) => {
      const id = matchIdRef.current;
      if (event.candidate && id)
        realtime.current?.send("rtc.ice", {
          matchId: id,
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
        });
    };
    peer.current = connection;
    return connection;
  }
  async function receiveRtc(event: {
    type: string;
    payload: Record<string, unknown>;
  }) {
    const connection = await ensurePeer();
    if (event.type === "rtc.ice")
      await connection.addIceCandidate({
        candidate: String(event.payload.candidate),
        sdpMid: event.payload.sdpMid as string | null,
        sdpMLineIndex: event.payload.sdpMLineIndex as number | null,
      });
    else {
      await connection.setRemoteDescription({
        type: event.type === "rtc.offer" ? "offer" : "answer",
        sdp: String(event.payload.sdp),
      });
      if (event.type === "rtc.offer") {
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        realtime.current?.send("rtc.answer", {
          matchId: String(event.payload.matchId),
          sdp: answer.sdp ?? "",
        });
      }
    }
  }
  async function createOffer(id: string) {
    const connection = await ensurePeer();
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    realtime.current?.send("rtc.offer", { matchId: id, sdp: offer.sdp ?? "" });
  }
  function teardown() {
    media.current.stop();
    peer.current?.close();
    peer.current = null;
    matchIdRef.current = undefined;
    if (localVideo.current) localVideo.current.srcObject = null;
    if (remoteVideo.current) remoteVideo.current.srcObject = null;
    setMatchId(undefined);
    setMessages([]);
  }
  const sendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    if (!matchId || !draft.trim()) return;
    const id = crypto.randomUUID();
    realtime.current?.send("chat.send", {
      matchId,
      clientMessageId: id,
      text: draft,
    });
    setMessages((items) => [...items, { id, text: draft, mine: true }]);
    setDraft("");
  };

  const submitReport = async (leave: boolean) => {
    if (!matchId) return;
    try {
      await api("/v1/reports", {
        method: "POST",
        body: JSON.stringify({
          clientRequestId: crypto.randomUUID(),
          reason: reportReason,
          note: reportNote || undefined,
          encounterId: matchId,
          leaveAfterSubmit: leave,
        }),
      });
      setReportOpen(false);
      if (leave) teardown();
      setToast(
        leave
          ? "Report submitted and the conversation was left."
          : "Report submitted. The conversation remains open.",
      );
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : "Report could not be submitted",
      );
    }
  };

  return (
    <main
      className={
        call.chatOpen ? "call-shell" : "call-shell call-shell--chat-closed"
      }
      id="main-content"
    >
      <header className="call-header">
        <Link className="public-wordmark" to="/app">
          PARAMINGLE<i>.</i>
        </Link>
        <Badge tone="warning">INTERFACE PREVIEW</Badge>
        <span className="connection-status">
          <i />
          {call.status === "reconnecting" ? "Reconnecting" : "Not connected"}
        </span>
      </header>
      {permissionError ? (
        <Card className="permission-banner" role="status">
          <div>
            <strong>Camera or microphone unavailable.</strong>
            <p>You can continue in text mode without granting media access.</p>
          </div>
          <Button onClick={() => call.setMode("text")} size="small">
            Use text instead
          </Button>
        </Card>
      ) : null}
      <section
        className="call-stage"
        aria-label={`${mode} conversation preview`}
      >
        <div className="remote-tile">
          {mode === "video" ? (
            <video
              autoPlay
              className="call-video"
              playsInline
              ref={remoteVideo}
            />
          ) : null}
          <div className="remote-empty">
            <span>?</span>
            <strong>
              {mode === "text" ? "TEXT MODE" : "CONNECTING STRANGER"}
            </strong>
          </div>
          <div className="tile-label">
            <span>STRANGER</span>
            <b>{mode === "text" ? "TEXT ONLY" : "CAMERA WAITING"}</b>
          </div>
        </div>
        <div className="local-tile">
          {mode === "video" ? (
            <video autoPlay muted playsInline ref={localVideo} />
          ) : null}
          <div>
            <span>YOU</span>
            <small>
              {call.videoEnabled && mode === "video" ? "PREVIEW" : "CAM OFF"}
            </small>
          </div>
        </div>
        <div className="call-identity">
          <Avatar name="Stranger preview" />
          <div>
            <span>Current encounter</span>
            <strong>Profile visibility applies here</strong>
          </div>
        </div>
      </section>
      <aside aria-label="Text chat" className="call-chat">
        <header>
          <div>
            <p className="eyebrow">SIDE CHANNEL</p>
            <h2>Chat</h2>
          </div>
          <IconButton label="Close chat" onClick={call.toggleChat}>
            ×
          </IconButton>
        </header>
        <div aria-live="polite" className="message-list">
          <p className="system-message">
            Messages will stay plain text and expire with random-chat retention.
          </p>
          {messages.map((message) => (
            <p
              className={message.mine ? "message message--mine" : "message"}
              key={message.id}
            >
              {message.text}
            </p>
          ))}
        </div>
        <form className="message-compose" onSubmit={sendMessage}>
          <label className="sr-only" htmlFor="preview-message">
            Message
          </label>
          <input
            disabled={!matchId}
            id="preview-message"
            onChange={(event) => setDraft(event.target.value)}
            placeholder={matchId ? "Write a message" : "Connect before sending"}
            value={draft}
          />
          <button disabled={!matchId || !draft.trim()} type="submit">
            ↑
          </button>
        </form>
      </aside>
      <nav aria-label="Conversation controls" className="call-dock">
        <button
          aria-pressed={!call.audioEnabled}
          onClick={call.toggleAudio}
          type="button"
        >
          <span>MIC</span>
          <b>{call.audioEnabled ? "ON" : "OFF"}</b>
        </button>
        <button
          aria-pressed={!call.videoEnabled}
          disabled={mode === "text"}
          onClick={call.toggleVideo}
          type="button"
        >
          <span>CAM</span>
          <b>{call.videoEnabled && mode === "video" ? "ON" : "OFF"}</b>
        </button>
        <button
          className="call-dock__next"
          onClick={() => {
            if (matchId) {
              realtime.current?.send("match.next", { matchId });
              teardown();
            }
          }}
          type="button"
        >
          <span>NEXT</span>
          <b>↗</b>
        </button>
        <button
          aria-expanded={call.chatOpen}
          onClick={call.toggleChat}
          type="button"
        >
          <span>TEXT</span>
          <b>{call.chatOpen ? "OPEN" : "CLOSED"}</b>
        </button>
        <button
          aria-label="Report conversation"
          onClick={() => setReportOpen(true)}
          type="button"
        >
          <span>FLAG</span>
          <b>REPORT</b>
        </button>
        <button
          aria-label="Block and end contact"
          onClick={() => setBlockOpen(true)}
          type="button"
        >
          <span>BLOCK</span>
          <b>END CONTACT</b>
        </button>
        <Link
          aria-label="Leave conversation"
          className="call-dock__leave"
          onClick={() => {
            if (matchId) realtime.current?.send("match.leave", { matchId });
            teardown();
          }}
          to="/app"
        >
          ×
        </Link>
      </nav>
      <Dialog
        actions={
          <>
            <Button
              onClick={() => void submitReport(false)}
              variant="secondary"
            >
              Submit report
            </Button>
            <Button onClick={() => void submitReport(true)} variant="danger">
              Submit and leave
            </Button>
          </>
        }
        description="Reporting does not automatically end the conversation. Choose the action you want."
        onClose={() => setReportOpen(false)}
        open={reportOpen}
        title="What happened?"
      >
        <div className="report-fields">
          <Select
            label="Reason"
            onChange={(event) => setReportReason(event.target.value)}
            value={reportReason}
          >
            <option value="harassment">Harassment</option>
            <option value="sexual_content">Sexual content</option>
            <option value="hate_or_threats">Hate or threats</option>
            <option value="minor_safety">Minor safety</option>
            <option value="spam_or_scam">Spam or scam</option>
            <option value="self_harm">Self-harm concern</option>
            <option value="other">Other</option>
          </Select>
          <Textarea
            label="Optional note"
            maxLength={1000}
            onChange={(event) => setReportNote(event.target.value)}
            placeholder="Add only the context moderators need."
            value={reportNote}
          />
        </div>
      </Dialog>
      <AlertDialog
        actions={
          <>
            <Button onClick={() => setBlockOpen(false)} variant="quiet">
              Cancel
            </Button>
            <Button
              onClick={() => {
                setBlockOpen(false);
                if (!peerId) return;
                void api("/v1/blocks", {
                  method: "POST",
                  body: JSON.stringify({
                    userId: peerId,
                    reasonCategory: "safety",
                  }),
                })
                  .then(() => {
                    teardown();
                    setToast(
                      "Blocked. Contact ended and future contact is unavailable.",
                    );
                  })
                  .catch(() =>
                    setToast("Block could not be completed. Try again."),
                  );
              }}
              variant="danger"
            >
              Block and end contact
            </Button>
          </>
        }
        description="Blocking ends this interaction and prevents future matching, requests, messages, calls, and profile access."
        onClose={() => setBlockOpen(false)}
        open={blockOpen}
        title="Block this person?"
      >
        <p>This safety control will remain free for every account.</p>
      </AlertDialog>
      <ToastRegion {...(toast ? { message: toast } : {})} />
    </main>
  );
}
