export type SystemRole = 'guest' | 'user' | 'pro' | 'contributor' | 'moderator' | 'admin';

export type Profile = {
  user_id: string;
  display_name: string | null;
  locale: string | null;
  home_city: string | null;
  role: SystemRole | null;
};

export type EntitlementFeature =
  | 'live_unlimited'
  | 'ai_guide'
  | 'ticket_alerts'
  | 'advanced_stats';

export type SignUpResult = {
  needsEmailConfirmation: boolean;
  emailAlreadyRegistered?: boolean;
};
