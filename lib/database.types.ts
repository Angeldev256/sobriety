// Mirrors supabase/migrations. Regenerate with:
//   npx supabase gen types typescript --project-id <ref> > lib/database.types.ts

export type AddictionType = "alcohol" | "nicotine" | "drugs" | "gambling" | "other";
export type GoalStatus = "not_started" | "in_progress" | "completed";
export type Theme = "system" | "light" | "dark";
export type AchievementKind = "sober_days" | "checkin_streak" | "goals_completed";

type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  country: string;
  theme: Theme;
  currency: string;
  welcome_email_sent: boolean;
  created_at: string;
  updated_at: string;
};

export type Addiction = {
  id: string;
  user_id: string;
  type: AddictionType;
  label: string | null;
  start_date: string;
  is_active: boolean;
  longest_streak_seconds: number;
  reason: string | null;
  daily_cost: number | null;
  created_at: string;
};

export type CheckIn = {
  id: string;
  user_id: string;
  addiction_id: string;
  date: string;
  mood: number;
  craving_level: number;
  triggers: string[];
  note: string | null;
  stayed_sober: boolean;
  created_at: string;
  updated_at: string;
};

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: GoalStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Achievement = {
  id: string;
  kind: AchievementKind;
  threshold: number;
  title: string;
  description: string;
  icon: string;
  sort_order: number;
};

export type UserAchievement = {
  id: string;
  user_id: string;
  achievement_id: string;
  addiction_id: string | null;
  earned_at: string;
  seen: boolean;
  notified: boolean;
};

export type Message = { id: number; body: string; author: string | null };

export type FavoriteMessage = { user_id: string; message_id: number; created_at: string };

export type Relapse = {
  id: string;
  user_id: string;
  addiction_id: string;
  occurred_at: string;
  note: string | null;
  counter_reset: boolean;
  previous_start_date: string;
  streak_seconds: number;
  created_at: string;
};

export type ReminderSetting = {
  user_id: string;
  enabled: boolean;
  reminder_time: string;
  email_enabled: boolean;
  last_sent_on: string | null;
  push_enabled: boolean;
  milestone_alerts: boolean;
  encouragement: boolean;
  updated_at: string;
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
};

export type NotificationKind = "welcome" | "reminder" | "milestone" | "encouragement" | "system" | "message" | "call" | "support";

export type Relationship = "counselor" | "sponsor" | "family" | "friend" | "peer" | "health_worker" | "faith_leader" | "professional" | "other";
export type ConnectionStatus = "pending" | "active" | "declined" | "ended";

export type SupportConnection = {
  id: string;
  member_id: string;
  member_name: string;
  helper_id: string | null;
  helper_name: string;
  helper_email: string;
  relationship: Relationship;
  phone: string | null;
  is_preferred: boolean;
  share_progress: boolean;
  status: ConnectionStatus;
  invite_token: string;
  created_at: string;
  accepted_at: string | null;
};

export type SupportMessage = {
  id: string;
  connection_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export type CallKind = "audio" | "video";

export type CallLog = {
  id: string;
  connection_id: string;
  caller_id: string;
  kind: CallKind;
  status: "completed" | "missed" | "declined" | "failed";
  duration_seconds: number;
  created_at: string;
};

export type AppNotification = {
  id: string;
  user_id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  url: string | null;
  read_at: string | null;
  created_at: string;
};

// ---- professional care ----
export type Profession = "counsellor" | "clinical_psychologist" | "psychiatrist" | "psychiatric_nurse" | "social_worker" | "addiction_specialist";
export type Specialty =
  | "alcohol" | "drugs" | "gambling" | "tobacco" | "dual_diagnosis" | "trauma"
  | "family" | "youth" | "women" | "relapse_prevention" | "withdrawal_medical";
export type SessionMode = "chat" | "audio" | "video";
export type ProfessionalStatus = "pending" | "verified" | "rejected" | "suspended";

export type Professional = {
  user_id: string;
  full_name: string;
  email: string;
  profession: Profession;
  licence_body: string;
  licence_number: string;
  institution: string | null;
  bio: string;
  specialties: Specialty[];
  languages: string[];
  session_modes: SessionMode[];
  fee_ugx: number;
  payout_phone: string | null;
  accepting_patients: boolean;
  status: ProfessionalStatus;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

/** The public card patients see (list_professionals). */
export type ProfessionalCard = Pick<
  Professional,
  "user_id" | "full_name" | "profession" | "licence_body" | "institution" | "bio" | "specialties" | "languages" | "session_modes" | "fee_ugx"
>;

export type IntakeMessage = { role: "user" | "assistant"; content: string; at: string };

export type CareIntake = {
  id: string;
  user_id: string;
  messages: IntakeMessage[];
  status: "open" | "assessed";
  assessment: unknown;
  crisis: boolean;
  created_at: string;
  updated_at: string;
};

export type ConsultationStatus = "awaiting_payment" | "paid" | "completed" | "cancelled" | "refunded";

export type Consultation = {
  id: string;
  patient_id: string;
  patient_name: string;
  professional_id: string | null;
  professional_name: string;
  intake_id: string | null;
  intake_summary: string | null;
  fee_ugx: number;
  platform_fee_ugx: number;
  status: ConsultationStatus;
  tx_ref: string;
  payment_provider: "flutterwave" | "manual" | null;
  provider_transaction_id: string | null;
  paid_at: string | null;
  connection_id: string | null;
  completed_at: string | null;
  created_at: string;
};

export type ResourceCategory = "guide" | "factsheet" | "treatment" | "family" | "policy" | "research" | "form";

export type Resource = {
  id: string;
  title: string;
  description: string | null;
  institution: string;
  category: ResourceCategory;
  source_url: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  status: "pending" | "published" | "archived";
  created_at: string;
  published_at: string | null;
};

export type AppSettings = { id: boolean; platform_fee_percent: number; updated_at: string };

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, "id">;
      addictions: Table<Addiction, "user_id" | "type" | "start_date">;
      check_ins: Table<CheckIn, "user_id" | "addiction_id" | "date" | "mood" | "craving_level" | "stayed_sober">;
      goals: Table<Goal, "user_id" | "title">;
      achievements: Table<Achievement, "id" | "kind" | "threshold" | "title" | "description" | "icon">;
      user_achievements: Table<UserAchievement, "user_id" | "achievement_id">;
      messages: Table<Message, "body">;
      favorite_messages: Table<FavoriteMessage, "user_id" | "message_id">;
      relapses: Table<Relapse, "user_id" | "addiction_id" | "counter_reset" | "previous_start_date" | "streak_seconds">;
      reminder_settings: Table<ReminderSetting, "user_id">;
      push_subscriptions: Table<PushSubscriptionRow, "user_id" | "endpoint" | "p256dh" | "auth">;
      notifications: Table<AppNotification, "user_id" | "kind" | "title" | "body">;
      support_connections: Table<SupportConnection, "member_id" | "member_name" | "helper_name" | "helper_email" | "relationship">;
      support_messages: Table<SupportMessage, "connection_id" | "sender_id" | "body">;
      call_logs: Table<CallLog, "connection_id" | "caller_id" | "kind" | "status">;
      admins: Table<{ user_id: string; created_at: string }, "user_id">;
      app_settings: Table<AppSettings>;
      professionals: Table<
        Professional,
        "user_id" | "full_name" | "email" | "profession" | "licence_body" | "licence_number" | "bio" | "specialties" | "languages" | "session_modes" | "fee_ugx"
      >;
      care_intakes: Table<CareIntake, "user_id">;
      consultations: Table<Consultation, "patient_id" | "patient_name" | "professional_name" | "fee_ugx" | "platform_fee_ugx">;
      resources: Table<Resource, "title" | "institution" | "category">;
    };
    Views: { [_ in never]: never };
    Functions: {
      delete_my_account: { Args: Record<string, never>; Returns: undefined };
      get_support_invite: {
        Args: { token: string };
        Returns: { member_name: string | null; helper_name: string; relationship: Relationship; status: ConnectionStatus; email_matches: boolean; is_self: boolean }[];
      };
      accept_support_invite: { Args: { token: string }; Returns: string };
      decline_support_invite: { Args: { token: string }; Returns: undefined };
      end_support_connection: { Args: { conn: string }; Returns: undefined };
      mark_support_read: { Args: { conn: string }; Returns: undefined };
      get_shared_progress: { Args: { conn: string }; Returns: { label: string | null; type: AddictionType; start_date: string }[] };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      list_professionals: { Args: Record<string, never>; Returns: ProfessionalCard[] };
      create_consultation: { Args: { pro: string; intake: string | null; share_summary: boolean }; Returns: string };
      cancel_consultation: { Args: { booking: string }; Returns: undefined };
      activate_consultation: { Args: { booking: string; provider: "flutterwave" | "manual"; provider_tx: string | null }; Returns: string };
      admin_mark_consultation_paid: { Args: { booking: string; reference: string }; Returns: string };
      complete_consultation: { Args: { booking: string }; Returns: undefined };
      admin_refund_consultation: { Args: { booking: string }; Returns: undefined };
      review_professional: { Args: { pro: string; decision: "verified" | "rejected" | "suspended"; note: string }; Returns: undefined };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
