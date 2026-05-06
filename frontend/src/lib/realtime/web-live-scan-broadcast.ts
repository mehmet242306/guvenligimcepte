import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export async function subscribeLiveScanBroadcastChannel(
  sessionId: string,
  userId: string,
  locationName: string,
): Promise<RealtimeChannel> {
  const supabase = createClient();
  if (!supabase) {
    throw new Error("NO_SUPABASE");
  }

  const channel = supabase.channel(`stream:${sessionId}`, {
    config: {
      broadcast: { self: false },
      presence: { key: userId },
    },
  });

  await new Promise<void>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error("live_scan_channel_timeout")), 15000);
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        window.clearTimeout(t);
        try {
          await channel.track({
            user_id: userId,
            role: "broadcaster",
            session_id: sessionId,
            location_name: locationName,
            started_at: new Date().toISOString(),
          });
        } catch {
          /* presence opsiyonel */
        }
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        window.clearTimeout(t);
        reject(new Error("live_scan_channel_error"));
      }
    });
  });

  return channel;
}

export async function sendLiveScanFrame(
  channel: RealtimeChannel | null,
  payload: {
    frameNumber: number;
    thumbnailBase64: string;
    gpsLat?: number | null;
    gpsLng?: number | null;
    heading?: number | null;
    riskCount: number;
  },
): Promise<void> {
  if (!channel) return;
  await channel.send({
    type: "broadcast",
    event: "frame",
    payload: {
      frame_number: payload.frameNumber,
      thumbnail: payload.thumbnailBase64,
      gps:
        payload.gpsLat != null && payload.gpsLng != null
          ? { lat: payload.gpsLat, lng: payload.gpsLng }
          : undefined,
      heading: payload.heading ?? undefined,
      risk_count: payload.riskCount,
      timestamp: Date.now(),
    },
  });
}

export function removeLiveScanChannel(channel: RealtimeChannel | null): void {
  if (!channel) return;
  const supabase = createClient();
  if (supabase) {
    void supabase.removeChannel(channel);
  }
}
