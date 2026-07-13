export type MediaQualityPolicy = {
  tier: "standard" | "premium";
  width: number;
  height: number;
  frameRate: number;
  maxBitrate: number;
  diagnosticsOnly: true;
};

export const STANDARD_MEDIA_POLICY: MediaQualityPolicy = {
  tier: "standard",
  width: 960,
  height: 540,
  frameRate: 24,
  maxBitrate: 900_000,
  diagnosticsOnly: true,
};

function constraints(
  policy: MediaQualityPolicy,
  facingMode?: string,
): MediaStreamConstraints {
  return {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: {
      width: { ideal: policy.width },
      height: { ideal: policy.height },
      frameRate: { ideal: policy.frameRate, max: policy.frameRate },
      ...(facingMode ? { facingMode: { ideal: facingMode } } : {}),
    },
  };
}

export async function applySenderPolicy(
  sender: RTCRtpSender,
  policy: MediaQualityPolicy,
  scale = 1,
) {
  if (
    !sender.track ||
    sender.track.kind !== "video" ||
    !sender.getParameters ||
    !sender.setParameters
  )
    return false;
  try {
    const parameters = sender.getParameters();
    parameters.encodings ??= [{}];
    parameters.encodings[0]!.maxBitrate = Math.max(
      180_000,
      Math.round(policy.maxBitrate * scale),
    );
    parameters.encodings[0]!.maxFramerate = Math.max(
      12,
      Math.round(policy.frameRate * scale),
    );
    parameters.degradationPreference = "maintain-framerate";
    await sender.setParameters(parameters);
    return true;
  } catch {
    return false;
  }
}

export class MediaManager {
  stream: MediaStream | null = null;
  policy = STANDARD_MEDIA_POLICY;
  private statsTimer: number | null = null;
  private previousPackets = 0;
  private previousLost = 0;

  async acquire(policy = this.policy, facingMode?: string) {
    if (!navigator.mediaDevices?.getUserMedia)
      throw new Error("media_unsupported");
    this.policy = policy;
    this.stream = await navigator.mediaDevices.getUserMedia(
      constraints(policy, facingMode),
    );
    return this.stream;
  }

  async switchCamera(facingMode: "user" | "environment") {
    const previous = this.stream;
    const replacement = await navigator.mediaDevices.getUserMedia(
      constraints(this.policy, facingMode),
    );
    this.stream = replacement;
    previous?.getTracks().forEach((track) => track.stop());
    return replacement;
  }

  async applyPolicy(connection: RTCPeerConnection, policy: MediaQualityPolicy) {
    this.policy = policy;
    await Promise.all(
      connection
        .getSenders()
        .map((sender) => applySenderPolicy(sender, policy)),
    );
    const video = this.stream?.getVideoTracks()[0];
    if (video?.applyConstraints)
      await video
        .applyConstraints(constraints(policy).video as MediaTrackConstraints)
        .catch(() => undefined);
  }

  monitor(
    connection: RTCPeerConnection,
    onDiagnostic: (message: string) => void,
  ) {
    this.stopMonitoring();
    const sample = async () => {
      try {
        const reports = await connection.getStats();
        let packets = 0,
          lost = 0,
          relay = false,
          rtt = 0;
        reports.forEach((rawReport) => {
          const report = rawReport as unknown as Record<string, unknown>;
          if (report.type === "remote-inbound-rtp" && report.kind === "video") {
            packets += Number(report.packetsReceived ?? 0);
            lost += Number(report.packetsLost ?? 0);
            rtt = Math.max(rtt, Number(report.roundTripTime ?? 0));
          }
          if (
            report.type === "candidate-pair" &&
            report.state === "succeeded" &&
            report.nominated &&
            typeof report.localCandidateId === "string"
          ) {
            const local = reports.get(report.localCandidateId) as
              | (Record<string, unknown> & { candidateType?: unknown })
              | undefined;
            relay ||= local?.candidateType === "relay";
          }
        });
        const delta = packets - this.previousPackets;
        const lostDelta = lost - this.previousLost;
        this.previousPackets = packets;
        this.previousLost = lost;
        const loss =
          delta + lostDelta > 0 ? lostDelta / (delta + lostDelta) : 0;
        const degraded = loss > 0.08 || rtt > 0.45 || relay;
        if (degraded) {
          await Promise.all(
            connection
              .getSenders()
              .map((sender) =>
                applySenderPolicy(sender, this.policy, relay ? 0.55 : 0.7),
              ),
          );
          onDiagnostic(
            relay
              ? "Quality adapted for a relayed connection."
              : "Quality adapted to current network conditions.",
          );
        }
      } catch {
        /* getStats is best-effort across browsers */
      }
    };
    this.statsTimer = window.setInterval(() => void sample(), 5_000);
  }

  stopMonitoring() {
    if (this.statsTimer !== null) window.clearInterval(this.statsTimer);
    this.statsTimer = null;
  }
  setAudio(enabled: boolean) {
    this.stream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }
  setVideo(enabled: boolean) {
    this.stream?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }
  stop() {
    this.stopMonitoring();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}
