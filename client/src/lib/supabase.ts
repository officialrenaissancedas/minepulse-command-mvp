import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;

export type RemoteObservation = {
  id: string;
  title: string;
  mine: string;
  severity: string;
  category: string;
  description: string;
  recipient: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

export type RemoteReport = {
  id: string;
  title: string;
  category: string;
  mine: string;
  severity: string;
  description: string;
  recipient: string;
  status: "Queued" | "Sent" | "Failed";
  created_at: string;
};

export async function ensureSupabaseSession() {
  if (!supabase) return { ok: false, error: new Error("Supabase is not configured") };
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) return { ok: false, error: sessionError };
  if (data.session) return { ok: true, session: data.session };
  const result = await supabase.auth.signInAnonymously();
  if (result.error) return { ok: false, error: result.error };
  return { ok: true, session: result.data.session };
}

export async function loadWorkspaceData() {
  if (!supabase) return { observations: [] as RemoteObservation[], reports: [] as RemoteReport[] };
  const [observationsResult, reportsResult] = await Promise.all([
    supabase.from("observations").select("id,title,mine,severity,category,description,recipient,latitude,longitude,created_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("reports").select("id,title,category,mine,severity,description,recipient,status,created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  if (observationsResult.error) throw observationsResult.error;
  if (reportsResult.error) throw reportsResult.error;
  return {
    observations: (observationsResult.data ?? []) as RemoteObservation[],
    reports: (reportsResult.data ?? []) as RemoteReport[],
  };
}

export async function createRemoteObservation(input: {
  id?: string;
  title: string;
  mine: string;
  severity: string;
  category: string;
  description: string;
  recipient: string;
  latitude: number | null;
  longitude: number | null;
}) {
  if (!supabase) throw new Error("Supabase is not configured");
  const session = await ensureSupabaseSession();
  if (!session.ok) throw session.error;
  const id = input.id ?? crypto.randomUUID();
  const { error: insertError } = await supabase.from("observations").upsert({ ...input, id }, { onConflict: "id", ignoreDuplicates: true });
  if (insertError) throw insertError;
  // Selecting after an idempotent upsert also covers a retry whose first response was lost.
  const { data, error } = await supabase.from("observations").select("id,title,mine,severity,category,description,recipient,latitude,longitude,created_at").eq("id", id).single();
  if (error) throw error;
  return data as RemoteObservation;
}

export async function uploadEvidence(observationId: string, file: File) {
  if (!supabase) throw new Error("Supabase is not configured");
  if (file.size > 10 * 1024 * 1024) throw new Error("Evidence files must be 10 MB or smaller");
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  const storagePath = `${observationId}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from("minepulse-evidence").upload(storagePath, file, {
    cacheControl: "3600",
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) throw uploadError;
  const { error: metadataError } = await supabase.from("evidence").insert({
    observation_id: observationId,
    storage_path: storagePath,
    file_name: file.name,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
  });
  if (metadataError) throw metadataError;
  return storagePath;
}

export async function markRiskReviewed(title: string) {
  if (!supabase) return;
  const { error } = await supabase.from("risk_reviews").upsert({ risk_title: title }, { onConflict: "risk_title,reviewer_id" });
  if (error) throw error;
}
