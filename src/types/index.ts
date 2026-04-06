export interface Clinic {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
  plan: 'starter' | 'growth' | 'pro';
  plan_status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'suspended';
  trial_ends_at: string | null;
  app_name: string | null;
  support_email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  is_active: boolean;
  onboarding_completed: boolean;
  onboarding_step: number;
  patient_count: number;
  primary_color: string;
  logo_url: string | null;
  created_at: string;
}

export interface ClinicStaff {
  id: string;
  clinic_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'staff' | 'readonly';
  full_name: string;
  email: string;
  is_active: boolean;
}

export interface PlatformAdmin {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

export interface PlatformNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  clinic_id: string | null;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}
