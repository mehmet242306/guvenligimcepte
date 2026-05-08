import { createClient } from "@/lib/supabase/client";

const SCAN_IMAGES_BUCKET = "scan-images";

export type ScanPathPoint = {
  lat: number;
  lng: number;
  timestamp: string;
};

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function calculateScanPathDistanceMeters(path: ScanPathPoint[]): number {
  if (path.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += haversineMeters(path[i - 1], path[i]);
  }
  return total;
}

export function calculateScanBounds(path: ScanPathPoint[]): {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
} | null {
  if (path.length === 0) return null;
  let minLat = path[0].lat;
  let maxLat = path[0].lat;
  let minLng = path[0].lng;
  let maxLng = path[0].lng;
  for (const p of path) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  return { minLat, minLng, maxLat, maxLng };
}

function extractMethodData(risk: Record<string, unknown>): Record<string, unknown> {
  const methodKeys = [
    "probability",
    "frequency",
    "severity",
    "risk_score",
    "risk_category",
    "likelihood",
    "rpn",
    "severity_score",
    "occurrence_score",
    "detection_score",
    "rpn_category",
    "guide_word",
    "deviation",
    "cause",
    "consequence",
    "safeguard",
    "action_required",
    "top_event",
    "threats",
    "prevention_barriers",
    "consequences",
    "mitigation_barriers",
    "c1_dynamic_score",
    "c2_temporal",
    "c3_interaction",
    "c4_environmental",
    "c5_human_factor",
    "c6_cascading",
    "c7_mitigation",
    "c8_exposure",
    "c9_ai_confidence",
    "r2d_composite",
    "job_step",
    "hazard_type",
    "exposure_level",
    "ppe_required",
    "safe_procedure",
    "initiating_event",
    "initiating_frequency",
    "ipl_layers",
    "mitigated_frequency",
    "checklist_item",
    "compliant",
    "regulation_ref",
    "priority",
    "corrective_action",
    "intermediate_events",
    "basic_events",
    "gate_type",
    "probability_estimate",
    "minimal_cut_sets",
    "route_target",
    "route_status",
    "route_record_id",
    "route_record_type",
    "route_record_label",
    "route_dedupe_key",
    "annotation_number",
    "manual_marker",
    "affected_workers",
  ];

  const data: Record<string, unknown> = {};
  for (const key of methodKeys) {
    if (risk[key] !== undefined) {
      data[key] = risk[key];
    }
  }
  return Object.keys(data).length > 0 ? data : {};
}

export async function uploadScanScreenshot(
  sessionId: string,
  frameNumber: number,
  base64Jpeg: string,
): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", auth.user?.id ?? "")
    .maybeSingle();

  const orgPath = profile?.organization_id ?? "unknown-org";
  const fileName = `${orgPath}/scans/${sessionId}/frame_${frameNumber}.jpg`;

  const blob = await fetch(`data:image/jpeg;base64,${base64Jpeg}`).then((r) => r.blob());
  const { error: uploadErr } = await supabase.storage
    .from(SCAN_IMAGES_BUCKET)
    .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });

  if (uploadErr) {
    console.warn("uploadScanScreenshot:", uploadErr.message);
    return null;
  }

  const { data: urlData } = supabase.storage.from(SCAN_IMAGES_BUCKET).getPublicUrl(fileName);
  return urlData?.publicUrl ?? null;
}

export async function createWebScanSession(args: {
  companyWorkspaceId: string;
  riskMethod: string;
  locationName: string;
  gpsStartLat?: number | null;
  gpsStartLng?: number | null;
}): Promise<{ id: string; user_id: string | null }> {
  const supabase = createClient();
  if (!supabase) throw new Error("NO_SUPABASE");

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("NOVA_AUTH_REQUIRED");

  const { data, error } = await supabase
    .from("scan_sessions")
    .insert({
      company_id: args.companyWorkspaceId,
      company_workspace_id: args.companyWorkspaceId,
      user_id: userId,
      risk_method: args.riskMethod,
      location_name: args.locationName,
      status: "active",
      gps_start_lat: args.gpsStartLat ?? null,
      gps_start_lng: args.gpsStartLng ?? null,
    })
    .select("id, user_id")
    .single();

  if (error) throw error;
  return { id: data.id, user_id: data.user_id };
}

export async function countScanDetectionsForSession(sessionId: string): Promise<number> {
  const supabase = createClient();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("scan_detections")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId);
  if (error) {
    console.warn("countScanDetectionsForSession:", error.message);
    return 0;
  }
  return count ?? 0;
}

/**
 * Oturum tamamlanınca DB tetikleyicisi `risk_assessments` oluşturur (metadata.source_session_id).
 */
export async function fetchRiskAssessmentIdForScanSession(sessionId: string): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("risk_assessments")
    .select("id")
    .filter("metadata->>source_session_id", "eq", sessionId)
    .maybeSingle();
  if (error) {
    console.warn("fetchRiskAssessmentIdForScanSession:", error.message);
    return null;
  }
  return data?.id ?? null;
}

async function waitForScanDerivedAssessment(sessionId: string): Promise<string | null> {
  for (let i = 0; i < 10; i++) {
    const id = await fetchRiskAssessmentIdForScanSession(sessionId);
    if (id) return id;
    await new Promise((r) => setTimeout(r, 450));
  }
  return null;
}

export type CompleteScanSessionResult = {
  riskCount: number;
  assessmentId: string | null;
};

export async function completeWebScanSessionWithPath(
  sessionId: string,
  summary: {
    totalFrames: number;
    durationSeconds: number;
    pathPoints: ScanPathPoint[];
  },
): Promise<CompleteScanSessionResult> {
  const supabase = createClient();
  if (!supabase) return { riskCount: 0, assessmentId: null };

  const dbRiskCount = await countScanDetectionsForSession(sessionId);

  const totalDistance = calculateScanPathDistanceMeters(summary.pathPoints);
  const bounds = calculateScanBounds(summary.pathPoints);

  const update: Record<string, unknown> = {
    status: "completed",
    total_risks_found: dbRiskCount,
    total_frames_analyzed: summary.totalFrames,
    duration_seconds: summary.durationSeconds,
    completed_at: new Date().toISOString(),
    path_coordinates: summary.pathPoints,
    total_distance_m: totalDistance,
  };

  if (bounds) {
    update.bounds_min_lat = bounds.minLat;
    update.bounds_min_lng = bounds.minLng;
    update.bounds_max_lat = bounds.maxLat;
    update.bounds_max_lng = bounds.maxLng;
  }

  const { error } = await supabase.from("scan_sessions").update(update).eq("id", sessionId);

  if (error) {
    console.warn("completeWebScanSessionWithPath:", error.message);
    return { riskCount: dbRiskCount, assessmentId: null };
  }

  let assessmentId: string | null = null;
  if (dbRiskCount > 0) {
    assessmentId = await waitForScanDerivedAssessment(sessionId);
  }

  return { riskCount: dbRiskCount, assessmentId };
}

export async function saveScanFrame(args: {
  sessionId: string;
  frameNumber: number;
  imageUrl: string | null;
  risksInFrame: number;
  facesDetected: number;
  analysisResult: unknown;
  gpsLat?: number | null;
  gpsLng?: number | null;
  compassHeading?: number | null;
  devicePitch?: number | null;
  deviceRoll?: number | null;
}): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  const { error } = await supabase.from("scan_frames").insert({
    session_id: args.sessionId,
    frame_number: args.frameNumber,
    image_url: args.imageUrl,
    risks_in_frame: args.risksInFrame,
    faces_detected: args.facesDetected,
    analysis_result: args.analysisResult,
    gps_lat: args.gpsLat ?? null,
    gps_lng: args.gpsLng ?? null,
    compass_heading: args.compassHeading ?? null,
    device_pitch: args.devicePitch ?? null,
    device_roll: args.deviceRoll ?? null,
  });

  if (error) {
    console.warn("saveScanFrame:", error.message);
  }
}

export async function saveScanDetection(args: {
  sessionId: string;
  companyWorkspaceId: string;
  frameNumber: number;
  risk: Record<string, unknown>;
  screenshotUrl: string | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
  compassHeading?: number | null;
}): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  const risk = args.risk;
  const { error } = await supabase.from("scan_detections").insert({
    session_id: args.sessionId,
    company_id: args.companyWorkspaceId,
    company_workspace_id: args.companyWorkspaceId,
    frame_number: args.frameNumber,
    risk_name: String(risk.risk_name ?? "Risk"),
    risk_level: String(risk.risk_level ?? "medium"),
    risk_category: (risk.risk_category as string | undefined) ?? null,
    confidence: typeof risk.confidence === "number" ? risk.confidence : 0,
    description: (risk.description as string | undefined) ?? null,
    recommended_action: (risk.recommended_action as string | undefined) ?? null,
    location_hint: (risk.location_hint as string | undefined) ?? null,
    method_specific_data: extractMethodData(risk),
    screenshot_url: args.screenshotUrl,
    gps_lat: args.gpsLat ?? null,
    gps_lng: args.gpsLng ?? null,
    compass_heading: args.compassHeading ?? null,
  });

  if (error) {
    console.warn("saveScanDetection:", error.message);
  }
}

export async function saveScanTwinPoint(args: {
  sessionId: string;
  companyWorkspaceId: string;
  pointIndex: number;
  imageUrl: string | null;
  risksAtPoint: unknown[];
  semanticClasses?: unknown[];
  objectDetections?: unknown[];
  spatialInference?: Record<string, unknown> | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
  gpsAccuracy?: number | null;
  compassHeading?: number | null;
}): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  const { error } = await supabase.from("digital_twin_points").insert({
    session_id: args.sessionId,
    company_id: args.companyWorkspaceId,
    company_workspace_id: args.companyWorkspaceId,
    point_index: args.pointIndex,
    gps_lat: args.gpsLat ?? null,
    gps_lng: args.gpsLng ?? null,
    gps_accuracy: args.gpsAccuracy ?? null,
    compass_heading: args.compassHeading ?? null,
    image_url: args.imageUrl,
    risks_at_point: args.risksAtPoint,
    semantic_classes: args.semanticClasses ?? [],
    object_detections: args.objectDetections ?? [],
    spatial_inference: args.spatialInference ?? {},
    captured_at: new Date().toISOString(),
  });

  if (error) {
    console.warn("saveScanTwinPoint:", error.message);
  }
}
