"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { GroupActorType } from "@/lib/groups/auth";

import { useT } from "../i18n/LocaleProvider";

type Participant = { connectionId: string; displayName: string };
type CallSnapshot = {
  id: string;
  startedByName: string;
  isStarter: boolean;
  participants: Participant[];
  createdAt: string;
};
type LocalCall = { id: string; connectionId: string; isStarter: boolean };
type Signal = {
  id: string;
  fromConnectionId: string;
  type: "offer" | "answer" | "candidate";
  payload: Record<string, unknown>;
  createdAt: number;
};

export function GroupVoiceCall({ actorType, groupId }: { actorType: GroupActorType; groupId: string }) {
  const t = useT();
  const [call, setCall] = useState<CallSnapshot | null>(null);
  const [localCall, setLocalCall] = useState<LocalCall | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const callIdRef = useRef<string | null>(null);
  const connectionIdRef = useRef<string | null>(null);
  const callStarterRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const iceServersRef = useRef<RTCIceServer[] | null>(null);
  const peersRef = useRef(new Map<string, RTCPeerConnection>());
  const audioRef = useRef(new Map<string, HTMLAudioElement>());
  const pendingCandidatesRef = useRef(new Map<string, RTCIceCandidateInit[]>());
  const seenSignalsRef = useRef(new Set<string>());
  const sinceRef = useRef(0);
  const heartbeatAtRef = useRef(0);
  const participantsRef = useRef<Participant[]>([]);
  const headers = useMemo(
    () => ({ "Content-Type": "application/json", "x-aranos-actor": actorType }),
    [actorType],
  );
  const callsEndpoint = `/api/grupos/${groupId}/llamadas`;

  const sendSignal = useCallback(async (
    callId: string,
    toConnectionId: string,
    type: Signal["type"],
    payload: RTCSessionDescriptionInit | RTCIceCandidateInit,
  ) => {
    const connectionId = connectionIdRef.current;
    if (!connectionId) return;
    const response = await fetch(`${callsEndpoint}/${callId}/senales`, {
      method: "POST",
      headers,
      body: JSON.stringify({ connectionId, toConnectionId, type, payload }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error ?? "groups.errors.voiceConnectionFailed");
    }
  }, [callsEndpoint, headers]);

  const closePeer = useCallback((connectionId: string) => {
    peersRef.current.get(connectionId)?.close();
    peersRef.current.delete(connectionId);
    const audio = audioRef.current.get(connectionId);
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      audioRef.current.delete(connectionId);
    }
    pendingCandidatesRef.current.delete(connectionId);
  }, []);

  const createPeer = useCallback(async (remoteConnectionId: string) => {
    const ownConnectionId = connectionIdRef.current;
    const callId = callIdRef.current;
    if (!ownConnectionId || !callId || !streamRef.current) return null;

    const existing = peersRef.current.get(remoteConnectionId);
    if (existing) return existing;

    const peer = new RTCPeerConnection({
      iceServers: iceServersRef.current ?? [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peersRef.current.set(remoteConnectionId, peer);
    streamRef.current.getAudioTracks().forEach((track) => peer.addTrack(track, streamRef.current!));
    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      void sendSignal(callId, remoteConnectionId, "candidate", event.candidate.toJSON()).catch(() => {
        setError("groups.errors.voiceConnectionFailed");
      });
    };
    peer.ontrack = (event) => {
      const audio = audioRef.current.get(remoteConnectionId) ?? new Audio();
      audio.autoplay = true;
      audio.srcObject = event.streams[0] ?? new MediaStream([event.track]);
      audioRef.current.set(remoteConnectionId, audio);
      void audio.play().catch(() => setError("groups.errors.audioPlayback"));
    };

    if (ownConnectionId < remoteConnectionId) {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await sendSignal(callId, remoteConnectionId, "offer", peer.localDescription!.toJSON());
    }
    return peer;
  }, [sendSignal]);

  const teardown = useCallback((notifyServer: boolean) => {
    const callId = callIdRef.current;
    const connectionId = connectionIdRef.current;
    if (notifyServer && callId && connectionId) {
      void fetch(callsEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: callStarterRef.current ? "end" : "leave",
          callId,
          connectionId,
        }),
      }).catch(() => undefined);
    }
    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();
    audioRef.current.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
    });
    audioRef.current.clear();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    iceServersRef.current = null;
    pendingCandidatesRef.current.clear();
    seenSignalsRef.current.clear();
    participantsRef.current = [];
    callIdRef.current = null;
    connectionIdRef.current = null;
    callStarterRef.current = false;
    setLocalCall(null);
    setMuted(false);
  }, [callsEndpoint, headers]);

  const reconcileParticipants = useCallback(async (participants: Participant[]) => {
    participantsRef.current = participants;
    const ownConnectionId = connectionIdRef.current;
    const activeIds = new Set(participants.map((participant) => participant.connectionId));
    for (const id of peersRef.current.keys()) {
      if (!activeIds.has(id)) closePeer(id);
    }
    for (const participant of participants) {
      if (participant.connectionId !== ownConnectionId && !peersRef.current.has(participant.connectionId)) {
        try {
          await createPeer(participant.connectionId);
        } catch {
          setError("groups.errors.voiceConnectionFailed");
        }
      }
    }
  }, [closePeer, createPeer]);

  const processSignals = useCallback(async (callId: string) => {
    const connectionId = connectionIdRef.current;
    if (!connectionId) return;
    const params = new URLSearchParams({ connectionId, since: String(sinceRef.current) });
    const response = await fetch(`${callsEndpoint}/${callId}/senales?${params}`, {
      headers: { "x-aranos-actor": actorType },
      cache: "no-store",
    });
    if (!response.ok) return;
    const data = await response.json();

    for (const signal of (data.signals ?? []) as Signal[]) {
      if (seenSignalsRef.current.has(signal.id)) continue;
      seenSignalsRef.current.add(signal.id);
      sinceRef.current = Math.max(sinceRef.current, signal.createdAt - 1);
      let peer = peersRef.current.get(signal.fromConnectionId);
      if (!peer) peer = (await createPeer(signal.fromConnectionId)) ?? undefined;
      if (!peer) continue;

      if (signal.type === "candidate") {
        const candidate = signal.payload as RTCIceCandidateInit;
        if (peer.remoteDescription) {
          await peer.addIceCandidate(candidate).catch(() => undefined);
        } else {
          const pending = pendingCandidatesRef.current.get(signal.fromConnectionId) ?? [];
          pending.push(candidate);
          pendingCandidatesRef.current.set(signal.fromConnectionId, pending);
        }
        continue;
      }

      await peer.setRemoteDescription(signal.payload as unknown as RTCSessionDescriptionInit);
      const candidates = pendingCandidatesRef.current.get(signal.fromConnectionId) ?? [];
      pendingCandidatesRef.current.delete(signal.fromConnectionId);
      for (const candidate of candidates) await peer.addIceCandidate(candidate).catch(() => undefined);

      if (signal.type === "offer") {
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        await sendSignal(callId, signal.fromConnectionId, "answer", peer.localDescription!.toJSON());
      }
    }
  }, [actorType, callsEndpoint, createPeer, sendSignal]);

  useEffect(() => {
    let active = true;
    let running = false;
    const poll = async () => {
      if (running) return;
      running = true;
      try {
        const response = await fetch(callsEndpoint, {
          headers: { "x-aranos-actor": actorType },
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!active) return;
        const snapshot = data.call as CallSnapshot | null;
        setCall(snapshot);
        const local = localCall;
        if (!local) return;
        if (!snapshot || snapshot.id !== local.id) {
          teardown(false);
          setError("groups.errors.callEnded");
          return;
        }

        await reconcileParticipants(snapshot.participants);
        const now = Date.now();
        if (now - heartbeatAtRef.current > 7000) {
          heartbeatAtRef.current = now;
          await fetch(callsEndpoint, {
            method: "POST",
            headers,
            body: JSON.stringify({ action: "heartbeat", callId: local.id, connectionId: local.connectionId }),
          });
        }
        await processSignals(local.id);
      } catch {
        if (active && localCall) setError("groups.errors.voiceConnectionFailed");
      } finally {
        running = false;
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 1800);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [actorType, callsEndpoint, headers, localCall, processSignals, reconcileParticipants, teardown]);

  useEffect(() => () => teardown(true), [teardown]);

  async function startOrJoin() {
    setBusy(true);
    setError(null);
    let stream: MediaStream;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("groups.errors.mediaUnavailable");
        setBusy(false);
        return;
      }
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch {
      setError("groups.errors.microphonePermission");
      setBusy(false);
      return;
    }

    const connectionId = crypto.randomUUID();
    const action = call ? "join" : "start";
    try {
      iceServersRef.current = [{ urls: "stun:stun.l.google.com:19302" }];
      try {
        const configResponse = await fetch(`/api/grupos/${groupId}/llamadas/ice-config`, {
          headers: { "x-aranos-actor": actorType },
          cache: "no-store",
        });
        if (configResponse.ok) {
          const config = await configResponse.json();
          if (Array.isArray(config.iceServers) && config.iceServers.length > 0) {
            iceServersRef.current = config.iceServers;
          }
        }
      } catch {
        // Si no hay configuración adicional, se conserva el STUN predeterminado.
      }

      let response = await fetch(callsEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ action, ...(call ? { callId: call.id } : {}), connectionId }),
      });
      let result = await response.json();
      if (!response.ok && response.status === 409 && result.callId) {
        const existingCallId = result.callId as string;
        response = await fetch(callsEndpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({ action: "join", callId: existingCallId, connectionId }),
        });
        result = await response.json();
      }
      if (!response.ok) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setError(result.error ?? "groups.errors.voiceConnectionFailed");
        return;
      }
      const id = result.callId as string;
      callIdRef.current = id;
      connectionIdRef.current = connectionId;
      callStarterRef.current = action === "start" && response.status === 201;
      heartbeatAtRef.current = Date.now();
      sinceRef.current = Date.now() - 10_000;
      seenSignalsRef.current.clear();
      setLocalCall({ id, connectionId, isStarter: callStarterRef.current });
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setError("groups.errors.network");
    } finally {
      setBusy(false);
    }
  }

  function toggleMuted() {
    const next = !muted;
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  }

  return (
    <section className="flex flex-wrap items-center justify-between gap-4 border-2 border-line bg-paper px-4 py-4">
      <div>
        <h3 className="font-display text-[18px] font-bold">{t("groups.voiceTitle")}</h3>
        <p className="mt-1 text-[13px] text-ink-soft">
          {localCall
            ? t("groups.inVoiceCall", { count: call?.participants.length ?? 1 })
            : call
              ? t("groups.activeCall", { name: call.startedByName, count: call.participants.length })
              : t("groups.voiceDescription")}
        </p>
        {error ? <p role="alert" className="mt-1 text-[12px] text-danger">{t(error as never)}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {localCall ? (
          <>
            <button type="button" onClick={toggleMuted} className="btn-outline btn-sm">
              {t(muted ? "groups.unmute" : "groups.mute")}
            </button>
            <button type="button" onClick={() => teardown(true)} className="btn-outline btn-sm">
              {call?.isStarter ? t("groups.endCall") : t("groups.leaveCall")}
            </button>
          </>
        ) : (
          <button type="button" onClick={() => void startOrJoin()} disabled={busy} className="btn-primary btn-sm disabled:opacity-50">
            {busy
              ? t("groups.connecting")
              : call
                ? t("groups.joinCall")
                : t("groups.startCall")}
          </button>
        )}
      </div>
      {call ? (
        <ul className="flex w-full flex-wrap gap-2" aria-label={t("groups.voiceParticipants")}>
          {call.participants.map((participant) => (
            <li key={participant.connectionId} className="tag-muted">{participant.displayName}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}