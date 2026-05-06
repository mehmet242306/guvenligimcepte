import { createClient } from "@/lib/supabase/client";

export type NovaVisionScanResult = {
  risks?: Array<Record<string, unknown>>;
  faces?: unknown[];
  ppe_audit?: unknown[];
  degraded?: boolean;
  [key: string]: unknown;
};

export async function invokeNovaVisionScan(args: {
  imageBase64: string;
  riskMethod: string;
  language: string;
  companyWorkspaceId: string;
  source?: string;
}): Promise<NovaVisionScanResult> {
  const supabase = createClient();
  if (!supabase) {
    throw new Error("NO_SUPABASE");
  }

  const { data, error } = await supabase.functions.invoke("nova-vision-scan", {
    body: {
      image_base64: args.imageBase64,
      risk_method: args.riskMethod,
      language: args.language,
      company_workspace_id: args.companyWorkspaceId,
      source: args.source ?? "web_live_scan",
    },
  });

  if (error) {
    throw new Error(error.message || "nova-vision-scan failed");
  }

  return (data ?? {}) as NovaVisionScanResult;
}
