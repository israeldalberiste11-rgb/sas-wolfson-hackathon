// ============================================
// SAS Wolfson Hackathon Club — Type Definitions
// ============================================

// ---- Auth & Roles ----
export type UserRole = 'student' | 'officer' | 'faculty_advisor' | 'mentor';

export interface UserProfile {
  id: string;
  auth_id?: string;
  email: string;
  full_name: string;
  /** Computed from full_name; not stored in DB */
  first_name?: string;
  /** Computed from full_name; not stored in DB */
  last_name?: string;
  role: UserRole;
  student_id?: string;
  grade_level?: number;       // 9-12
  graduation_year?: number;
  technical_skills?: string[];
  github_url?: string;
  shirt_size?: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
  avatar_url?: string;

  // Emergency & Compliance
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  parent_consent_status?: 'pending' | 'approved' | 'rejected' | 'not_submitted';
  parent_consent_file_path?: string;
  medical_allergies?: string;
  medical_notes?: string;

  // Travel Eligibility
  gpa_cleared?: boolean;
  membership_active?: boolean;
  travel_eligible?: boolean;

  // Admin-only fields
  is_whitelisted_staff?: boolean;
  invited_by?: string;

  created_at: string;
  updated_at: string;
}

// ---- Events ----
export type EventStatus = 'upcoming' | 'registration_open' | 'registration_closed' | 'ongoing' | 'completed' | 'cancelled';
export type RegistrationStatus = 'registered' | 'waitlisted' | 'approved_to_travel' | 'checked_in' | 'cancelled' | 'no_show';

export interface HackathonEvent {
  id: string;
  name: string;
  slug: string;
  description: string;
  event_status: EventStatus;

  // Dates & Times
  start_date_time: string;
  end_date_time: string;
  registration_opens_at: string;
  registration_closes_at: string;
  submission_deadline?: string;

  // Location & Logistics
  venue_name: string;
  venue_address: string;
  city: string;
  is_virtual: boolean;
  meeting_link?: string;

  // Transport (configurable per event)
  transport_provided: boolean;
  bus_capacity: number;           // default 40
  transport_pickup_location?: string;
  transport_pickup_time?: string;

  // Team config (configurable per event)
  max_team_size: number;          // default 4

  // Eligibility
  eligibility_rules: string;
  min_grade_level?: number;
  requires_parent_consent: boolean;
  requires_gpa_clearance: boolean;

  // External Links
  luma_event_id?: string;
  luma_registration_url?: string;
  devpost_url?: string;

  // Budget
  stipend_cap_per_student: number; // default $500
  deposit_amount: number;           // default $20

  // Chaperone requirement
  chaperone_ratio: number;         // default 10 (1 chaperone per N students)

  // Stats (computed/aggregate)
  registered_count?: number;
  approved_count?: number;

  created_by: string;
  created_at: string;
  updated_at: string;
}

// ---- Teams ----
export type TeamStatus = 'draft' | 'inviting' | 'full' | 'locked' | 'submitted';

export interface Team {
  id: string;
  event_id: string;
  name: string;
  description?: string;
  status: TeamStatus;
  leader_id: string;
  max_members: number;
  devpost_project_url?: string;
  devpost_project_title?: string;
  created_at: string;
  updated_at: string;

  // Joined relations
  members?: TeamMember[];
  event?: HackathonEvent;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'leader' | 'member';
  invite_status: 'pending' | 'accepted' | 'declined';
  invited_at: string;
  responded_at?: string;

  // Joined
  user?: UserProfile;
}

// ---- Registrations ----
export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  team_id?: string;
  status: RegistrationStatus;
  registered_at: string;
  waitlist_position?: number;
  checked_in_at?: string;
  deposit_paid: boolean;
  deposit_refunded: boolean;
  excused: boolean;
  excuse_reason?: string;
  excuse_deadline: string;       // 48h before event start

  // Transport
  transport_requested: boolean;
  transport_seat_confirmed: boolean;
  bus_seat_number?: number;

  // Lu.ma sync
  luma_ticket_ref?: string;
  luma_synced: boolean;

  // Receipt / Reimbursement
  receipt_file_path?: string;
  reimbursement_status: 'none' | 'submitted' | 'approved' | 'rejected' | 'paid';
  reimbursement_amount?: number;
  reimbursement_notes?: string;

  // Joined
  event?: HackathonEvent;
  user?: UserProfile;
  team?: Team;
}

// ---- Equipment ----
export type EquipmentStatus = 'available' | 'checked_out' | 'overdue' | 'missing' | 'retired';

export interface EquipmentItem {
  id: string;
  name: string;
  category: 'microcontroller' | 'testing_device' | 'cable' | 'peripheral' | 'tool' | 'other';
  serial_number?: string;
  status: EquipmentStatus;
  current_holder_user_id?: string;
  checked_out_at?: string;
  due_back_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EquipmentCheckout {
  id: string;
  equipment_id: string;
  user_id: string;
  checked_out_at: string;
  due_back_at: string;
  returned_at?: string;
  status: 'active' | 'returned' | 'overdue' | 'lost';
  notes?: string;

  equipment?: EquipmentItem;
  user?: UserProfile;
}

// ---- Budget ----
export type LedgerEntryType = 'allocation' | 'bus_expense' | 'ticket_expense' | 'food_expense'
  | 'stipend' | 'deposit' | 'deposit_forfeited' | 'reimbursement' | 'other_income' | 'other_expense';

export interface BudgetLedger {
  id: string;
  event_id?: string;
  entry_type: LedgerEntryType;
  description: string;
  amount: number;               // positive = income, negative = expense
  currency: string;             // 'USD'
  receipt_file_path?: string;
  submitted_by: string;
  approved_by?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

// ---- Showcase / Portfolio ----
export type ShowcaseStatus = 'draft' | 'pending_review' | 'published' | 'archived';

export interface PastShowcase {
  id: string;
  event_id: string;
  team_id: string;
  project_title: string;
  project_description: string;
  demo_url?: string;
  screenshot_urls: string[];
  video_url?: string;
  awards_won?: string[];
  prize_money?: number;
  status: ShowcaseStatus;
  published_by: string;
  created_at: string;
  updated_at: string;

  // Joined
  event?: HackathonEvent;
  team?: Team;
  team_member_first_names?: string[];  // denormalized for public view
}

// ---- Chaperones ----
export interface ChaperoneAssignment {
  id: string;
  event_id: string;
  user_id?: string;              // faculty_advisor or vetted adult
  external_name?: string;         // non-system chaperone
  external_phone?: string;
  role: 'faculty_advisor' | 'officer' | 'vetted_adult';
  assigned_at: string;
  confirmed: boolean;
}

// ---- Notifications ----
export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  read: boolean;
  action_url?: string;
  created_at: string;
}

// ---- Real-time Channels ----
export const REALTIME_CHANNELS = {
  EVENT_UPDATES: 'event-updates',
  TEAM_CHANGES: 'team-changes',
  REGISTRATION_CHANGES: 'registration-changes',
  TRAVEL_ALERTS: 'travel-alerts',
  CHECK_IN: 'check-in',
} as const;

// ---- Constants ----
export const DEFAULT_BUS_CAPACITY = 40;
export const DEFAULT_MAX_TEAM_SIZE = 4;
export const DEFAULT_STIPEND_CAP = 500;
export const DEFAULT_DEPOSIT_AMOUNT = 20;
export const DEFAULT_CHAPERONE_RATIO = 10;
export const EXCUSE_DEADLINE_HOURS = 48;
export const PUSH_REMINDER_MINUTES = [60, 15] as const;
export const ALLOWED_STUDENT_DOMAIN = 'students.dadeschools.net';
export const ALLOWED_STAFF_DOMAIN = 'dadeschools.net';
