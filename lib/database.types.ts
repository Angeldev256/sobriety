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

export type Relationship = "counselor" | "sponsor" | "family" | "friend" | "peer" | "health_worker" | "faith_leader" | "other";
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
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
