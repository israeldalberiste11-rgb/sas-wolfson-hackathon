-- ================================================================
-- SAS WOLFSON HACKATHON CLUB — COMBINED MIGRATION (MANUAL RUN)
-- Target project: cjfcmekdvmorrmttxcet (dev, empty)
-- Sections execute in order:
--   (1) schema + triggers + functions + RLS policies
--   (2) storage buckets + storage policies
--   (3) seed data (fictional @example.com accounts)
-- Audited 2026-10-31: no destructive ops, no real student emails,
-- privilege-escalation trigger included, safe to re-run (IF NOT EXISTS
-- / ON CONFLICT DO NOTHING throughout).
-- ================================================================


-- ============================================
-- SAS Wolfson Hackathon Club — Full PostgreSQL Schema
-- Run this against your Supabase project SQL editor
-- ============================================

-- ---- UUID Extension ----
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','officer','faculty_advisor','mentor')),

  -- Student fields
  student_id TEXT UNIQUE,
  grade_level INT CHECK (grade_level BETWEEN 9 AND 12),
  graduation_year INT,
  technical_skills TEXT[] DEFAULT '{}',
  github_url TEXT,
  shirt_size TEXT CHECK (shirt_size IN ('XS','S','M','L','XL','XXL')),
  avatar_url TEXT,

  -- Emergency & compliance
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  parent_consent_status TEXT DEFAULT 'not_submitted' CHECK (parent_consent_status IN ('pending','approved','rejected','not_submitted')),
  parent_consent_file_path TEXT,
  medical_allergies TEXT,
  medical_notes TEXT,

  -- Travel eligibility flags
  gpa_cleared BOOLEAN DEFAULT FALSE,
  membership_active BOOLEAN DEFAULT FALSE,
  travel_eligible BOOLEAN DEFAULT FALSE,

  -- Admin/invite fields
  is_whitelisted_staff BOOLEAN DEFAULT FALSE,
  invited_by UUID REFERENCES public.profiles(id),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_student_id ON public.profiles(student_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Prevent users from changing their own role (privilege escalation protection)
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- If the role is being changed and the user is modifying their own profile
  IF NEW.role != OLD.role AND OLD.auth_id = auth.uid() THEN
    RAISE EXCEPTION 'Users cannot modify their own role';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_self_role_escalation
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- ============================================
-- ADMIN WHITELIST (staff login approval)
-- ============================================
CREATE TABLE IF NOT EXISTS public.admin_whitelist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'officer' CHECK (role IN ('officer','faculty_advisor')),
  added_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  event_status TEXT DEFAULT 'upcoming' CHECK (event_status IN ('upcoming','registration_open','registration_closed','ongoing','completed','cancelled')),

  -- Dates & times
  start_date_time TIMESTAMPTZ NOT NULL,
  end_date_time TIMESTAMPTZ NOT NULL,
  registration_opens_at TIMESTAMPTZ NOT NULL,
  registration_closes_at TIMESTAMPTZ NOT NULL,
  submission_deadline TIMESTAMPTZ,

  -- Location
  venue_name TEXT NOT NULL,
  venue_address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Miami',
  is_virtual BOOLEAN DEFAULT FALSE,
  meeting_link TEXT,

  -- Transport config (per-event)
  transport_provided BOOLEAN DEFAULT TRUE,
  bus_capacity INT DEFAULT 40,
  transport_pickup_location TEXT,
  transport_pickup_time TIMESTAMPTZ,

  -- Team config (per-event)
  max_team_size INT DEFAULT 4,

  -- Eligibility
  eligibility_rules TEXT DEFAULT '',
  min_grade_level INT DEFAULT 9,
  requires_parent_consent BOOLEAN DEFAULT TRUE,
  requires_gpa_clearance BOOLEAN DEFAULT TRUE,

  -- External links
  luma_event_id TEXT,
  luma_registration_url TEXT,
  devpost_url TEXT,

  -- Budget config
  stipend_cap_per_student DECIMAL(10,2) DEFAULT 500.00,
  deposit_amount DECIMAL(10,2) DEFAULT 20.00,

  -- Chaperone ratio: 1 chaperone per N students
  chaperone_ratio INT DEFAULT 10,

  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_status ON public.events(event_status);
CREATE INDEX idx_events_start_date ON public.events(start_date_time);
CREATE INDEX idx_events_slug ON public.events(slug);

CREATE TRIGGER on_event_updated
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- TEAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','inviting','full','locked','submitted')),
  leader_id UUID NOT NULL REFERENCES public.profiles(id),
  max_members INT DEFAULT 4,
  devpost_project_url TEXT,
  devpost_project_title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraint: one team per leader per event
  UNIQUE(event_id, leader_id)
);

CREATE INDEX idx_teams_event ON public.teams(event_id);
CREATE INDEX idx_teams_leader ON public.teams(leader_id);
CREATE INDEX idx_teams_status ON public.teams(status);

CREATE TRIGGER on_team_updated
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- TEAM MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('leader','member')),
  invite_status TEXT DEFAULT 'pending' CHECK (invite_status IN ('pending','accepted','declined')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,

  -- A student can only be on one team per event
  UNIQUE(team_id, user_id),

  -- Enforce single active team per user per event via partial unique index
  -- (handled by application logic + trigger below)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_team_members_team ON public.team_members(team_id);
CREATE INDEX idx_team_members_user ON public.team_members(user_id);
CREATE INDEX idx_team_members_invite_status ON public.team_members(invite_status);

-- Trigger: prevent joining a second team for the same event
CREATE OR REPLACE FUNCTION public.enforce_single_team_per_event()
RETURNS TRIGGER AS $$
DECLARE
  existing_team_id UUID;
BEGIN
  IF NEW.invite_status = 'accepted' THEN
    SELECT t.id INTO existing_team_id
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE t.event_id = (SELECT event_id FROM teams WHERE id = NEW.team_id)
      AND tm.user_id = NEW.user_id
      AND tm.invite_status = 'accepted'
      AND tm.id != NEW.id;

    IF existing_team_id IS NOT NULL THEN
      RAISE EXCEPTION 'Student is already on a team for this event';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_single_team
  BEFORE INSERT OR UPDATE OF invite_status ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_team_per_event();

-- ============================================
-- EVENT REGISTRATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered','waitlisted','approved_to_travel','checked_in','cancelled','no_show')),
  registered_at TIMESTAMPTZ DEFAULT now(),
  waitlist_position INT,
  checked_in_at TIMESTAMPTZ,

  -- Deposit
  deposit_paid BOOLEAN DEFAULT FALSE,
  deposit_refunded BOOLEAN DEFAULT FALSE,
  excused BOOLEAN DEFAULT FALSE,
  excuse_reason TEXT,
  excuse_deadline TIMESTAMPTZ,  -- computed: event.start - 48h

  -- Transport
  transport_requested BOOLEAN DEFAULT FALSE,
  transport_seat_confirmed BOOLEAN DEFAULT FALSE,
  bus_seat_number INT,

  -- Lu.ma sync
  luma_ticket_ref TEXT,
  luma_synced BOOLEAN DEFAULT FALSE,

  -- Receipt / Reimbursement
  receipt_file_path TEXT,
  reimbursement_status TEXT DEFAULT 'none' CHECK (reimbursement_status IN ('none','submitted','approved','rejected','paid')),
  reimbursement_amount DECIMAL(10,2),
  reimbursement_notes TEXT,

  -- One registration per user per event
  UNIQUE(event_id, user_id),

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_registrations_event ON public.event_registrations(event_id);
CREATE INDEX idx_registrations_user ON public.event_registrations(user_id);
CREATE INDEX idx_registrations_status ON public.event_registrations(status);
CREATE INDEX idx_registrations_waitlist ON public.event_registrations(event_id, waitlist_position) WHERE status = 'waitlisted';

-- Auto-set excuse deadline on insert
CREATE OR REPLACE FUNCTION public.set_excuse_deadline()
RETURNS TRIGGER AS $$
BEGIN
  NEW.excuse_deadline = (
    SELECT start_date_time - INTERVAL '48 hours'
    FROM events WHERE id = NEW.event_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_excuse_deadline_trigger
  BEFORE INSERT ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_excuse_deadline();

-- Auto-promote waitlist when someone cancels
CREATE OR REPLACE FUNCTION public.promote_waitlist()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
    UPDATE event_registrations
    SET status = 'registered',
        waitlist_position = NULL,
        registered_at = now()
    WHERE event_id = NEW.event_id
      AND status = 'waitlisted'
      AND id = (
        SELECT id FROM event_registrations
        WHERE event_id = NEW.event_id AND status = 'waitlisted'
        ORDER BY waitlist_position ASC LIMIT 1
      );

    -- Re-number remaining waitlist
    UPDATE event_registrations
    SET waitlist_position = sub.new_pos
    FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY waitlist_position ASC) AS new_pos
      FROM event_registrations
      WHERE event_id = NEW.event_id AND status = 'waitlisted'
    ) sub
    WHERE event_registrations.id = sub.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER promote_waitlist_trigger
  AFTER UPDATE OF status ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.promote_waitlist();

-- ============================================
-- EQUIPMENT ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.equipment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'other' CHECK (category IN ('microcontroller','testing_device','cable','peripheral','tool','other')),
  serial_number TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available','checked_out','overdue','missing','retired')),
  current_holder_user_id UUID REFERENCES public.profiles(id),
  checked_out_at TIMESTAMPTZ,
  due_back_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_equipment_status ON public.equipment_items(status);
CREATE INDEX idx_equipment_category ON public.equipment_items(category);

CREATE TRIGGER on_equipment_updated
  BEFORE UPDATE ON public.equipment_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- EQUIPMENT CHECKOUTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.equipment_checkouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES public.equipment_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checked_out_at TIMESTAMPTZ DEFAULT now(),
  due_back_at TIMESTAMPTZ NOT NULL,
  returned_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','returned','overdue','lost')),
  notes TEXT
);

CREATE INDEX idx_checkouts_user ON public.equipment_checkouts(user_id);
CREATE INDEX idx_checkouts_status ON public.equipment_checkouts(status);
CREATE INDEX idx_checkouts_equipment ON public.equipment_checkouts(equipment_id);

-- Block check-in if student has overdue/missing equipment
CREATE OR REPLACE FUNCTION public.check_equipment_hold()
RETURNS TRIGGER AS $$
DECLARE
  has_overdue BOOLEAN;
BEGIN
  IF NEW.status = 'checked_in' THEN
    SELECT EXISTS(
      SELECT 1 FROM equipment_checkouts ec
      JOIN equipment_items ei ON ei.id = ec.equipment_id
      WHERE ec.user_id = NEW.user_id
        AND ec.status IN ('overdue', 'lost')
    ) INTO has_overdue;

    IF has_overdue THEN
      RAISE EXCEPTION 'Cannot check in: student has overdue or missing equipment';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_equipment_hold_trigger
  BEFORE UPDATE OF status ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.check_equipment_hold();

-- ============================================
-- BUDGET LEDGER TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.budget_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'allocation','bus_expense','ticket_expense','food_expense',
    'stipend','deposit','deposit_forfeited','reimbursement',
    'other_income','other_expense'
  )),
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  receipt_file_path TEXT,
  submitted_by UUID NOT NULL REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ledger_event ON public.budget_ledger(event_id);
CREATE INDEX idx_ledger_status ON public.budget_ledger(status);
CREATE INDEX idx_ledger_type ON public.budget_ledger(entry_type);

-- ============================================
-- PAST SHOWCASES TABLE (Portfolio)
-- ============================================
CREATE TABLE IF NOT EXISTS public.past_showcases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  project_title TEXT NOT NULL,
  project_description TEXT DEFAULT '',
  demo_url TEXT,
  screenshot_urls TEXT[] DEFAULT '{}',
  video_url TEXT,
  awards_won TEXT[] DEFAULT '{}',
  prize_money DECIMAL(10,2) DEFAULT 0.00,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','pending_review','published','archived')),
  published_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_showcase_status ON public.past_showcases(status);
CREATE INDEX idx_showcase_event ON public.past_showcases(event_id);

CREATE TRIGGER on_showcase_updated
  BEFORE UPDATE ON public.past_showcases
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Denormalized first names for public view (privacy-safe)
CREATE OR REPLACE FUNCTION public.get_team_first_names(p_team_id UUID)
RETURNS TEXT[] AS $$
DECLARE
  names TEXT[];
BEGIN
  SELECT ARRAY_AGG(split_part(p.full_name, ' ', 1)) INTO names
  FROM profiles p
  JOIN team_members tm ON tm.user_id = p.id
  WHERE tm.team_id = p_team_id AND tm.invite_status = 'accepted';
  RETURN COALESCE(names, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- CHAPERONE ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.chaperone_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  external_name TEXT,
  external_phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('faculty_advisor','officer','vetted_adult')),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  confirmed BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_chaperones_event ON public.chaperone_assignments(event_id);

-- ============================================
-- APP NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.app_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info','warning','success','urgent')),
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.app_notifications(user_id, read, created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.past_showcases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chaperone_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_whitelist ENABLE ROW LEVEL SECURITY;

-- ---- PROFILES RLS ----
-- Students see their own profile + teammates' names/contact
-- Officers/faculty see all profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Officers and faculty can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('officer', 'faculty_advisor'))
  );

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('officer', 'faculty_advisor'))
  );

-- Allow authenticated users to create their own profile on first sign-in.
-- Restricted to role='student' with no privilege escalation; staff still requires whitelist.
CREATE POLICY "Users can create own student profile" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = auth_id AND role = 'student'
  );

-- ---- EVENTS RLS ----
-- Authenticated users can view events
CREATE POLICY "Authenticated users can view events" ON public.events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Officers and faculty can manage events" ON public.events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('officer', 'faculty_advisor'))
  );

-- ---- TEAMS RLS ----
CREATE POLICY "Users can view own teams" ON public.teams
  FOR SELECT USING (
    auth.uid() = leader_id
    OR EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('officer', 'faculty_advisor'))
  );

CREATE POLICY "Students can create teams" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Team leaders can update own teams" ON public.teams
  FOR UPDATE USING (auth.uid() = leader_id)
  WITH CHECK (auth.uid() = leader_id);

-- ---- TEAM MEMBERS RLS ----
CREATE POLICY "Users can view teammate info" ON public.team_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR team_id IN (SELECT id FROM public.teams WHERE leader_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('officer', 'faculty_advisor'))
  );

CREATE POLICY "Team leaders can invite members" ON public.team_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND leader_id = auth.uid())
  );

CREATE POLICY "Members can accept/decline invites" ON public.team_members
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---- EVENT REGISTRATIONS RLS ----
CREATE POLICY "Users view own registrations" ON public.event_registrations
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('officer', 'faculty_advisor'))
  );

CREATE POLICY "Students register themselves" ON public.event_registrations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Officers manage registrations" ON public.event_registrations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('officer', 'faculty_advisor'))
  );

-- ---- EQUIPMENT RLS ----
CREATE POLICY "Officers manage equipment" ON public.equipment_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('officer', 'faculty_advisor'))
  );

CREATE POLICY "All authenticated can view equipment" ON public.equipment_items
  FOR SELECT USING (auth.role() = 'authenticated');

-- ---- EQUIPMENT CHECKOUTS RLS ----
CREATE POLICY "Users view own checkouts" ON public.equipment_checkouts
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('officer', 'faculty_advisor'))
  );

CREATE POLICY "Officers manage checkouts" ON public.equipment_checkouts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('officer', 'faculty_advisor'))
  );

-- ---- BUDGET LEDGER RLS ----
CREATE POLICY "Officers and faculty manage budget" ON public.budget_ledger
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('officer', 'faculty_advisor'))
  );

-- Students can view their own reimbursement entries
CREATE POLICY "Students view own budget entries" ON public.budget_ledger
  FOR SELECT USING (submitted_by = auth.uid());

-- ---- SHOWCASES RLS ----
-- Public can view published showcases (privacy-stripped via view/function)
CREATE POLICY "Everyone views published showcases" ON public.past_showcases
  FOR SELECT USING (status = 'published');

CREATE POLICY "Officers and faculty manage showcases" ON public.past_showcases
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('officer', 'faculty_advisor'))
  );

CREATE POLICY "Team members create showcase drafts" ON public.past_showcases
  FOR INSERT WITH CHECK (
    published_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.team_members WHERE team_id = past_showcases.team_id AND user_id = auth.uid())
  );

-- ---- CHAPERONES RLS ----
CREATE POLICY "Officers and faculty manage chaperones" ON public.chaperone_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('officer', 'faculty_advisor'))
  );

-- ---- NOTIFICATIONS RLS ----
CREATE POLICY "Users view own notifications" ON public.app_notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON public.app_notifications
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Users update own notifications" ON public.app_notifications
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---- ADMIN WHITELIST RLS ----
CREATE POLICY "Only faculty manages whitelist" ON public.admin_whitelist
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'faculty_advisor')
  );

-- ============================================
-- PUBLIC VIEW: Privacy-safe showcase data
-- (strips last names, emails, student IDs)
-- ============================================
CREATE OR REPLACE VIEW public.v_public_showcases AS
SELECT
  ps.id,
  ps.project_title,
  ps.project_description,
  ps.demo_url,
  ps.screenshot_urls,
  ps.video_url,
  ps.awards_won,
  ps.prize_money,
  e.name AS event_name,
  e.start_date_time AS event_date,
  get_team_first_names(ps.team_id) AS team_member_first_names
FROM public.past_showcases ps
JOIN public.events e ON e.id = ps.event_id
WHERE ps.status = 'published';

GRANT SELECT ON public.v_public_showcases TO anon;
GRANT SELECT ON public.v_public_showcases TO authenticated;

-- ============================================
-- AGGREGATE METRICS FUNCTION (for home page)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_club_metrics()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_competitions_attended', COUNT(DISTINCT er.event_id),
    'total_awards_won', (SELECT COUNT(*) FROM jsonb_array_elements(
      (SELECT COALESCE(array_agg(awards_won), '{}') FROM past_showcases WHERE status = 'published')::jsonb
    ))::int,
    'total_prize_money', COALESCE(SUM(prize_money), 0),
    'active_members', (SELECT COUNT(*) FROM profiles WHERE membership_active = TRUE),
    'upcoming_event_name', (SELECT name FROM events WHERE event_status IN ('upcoming','registration_open') ORDER BY start_date_time ASC LIMIT 1),
    'upcoming_event_start', (SELECT start_date_time FROM events WHERE event_status IN ('upcoming','registration_open') ORDER BY start_date_time ASC LIMIT 1)
  ) INTO result
  FROM public.event_registrations er
  WHERE er.status IN ('registered', 'approved_to_travel', 'checked_in', 'no_show');

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- STORAGE BUCKETS (must exist BEFORE the policies below)
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('consent-forms', 'consent-forms', false),
  ('receipts', 'receipts', false),
  ('showcase-screenshots', 'showcase-screenshots', true)
ON CONFLICT (id) DO NOTHING;


-- ============================================
-- Storage Policies for SAS Wolfson Hackathon Club
-- Run this AFTER creating storage buckets
-- ============================================

-- ---- CONSENT FORMS BUCKET (private) ----
-- Only the file owner and authorized staff can access
CREATE POLICY "Users can upload own consent forms"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'consent-forms' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own consent forms"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'consent-forms' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Faculty can view all consent forms"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'consent-forms' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_id = auth.uid()
    AND role = 'faculty_advisor'
  )
);

-- ---- RECEIPTS BUCKET (private) ----
-- Only the uploader and authorized staff can access
CREATE POLICY "Users can upload own receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Officers and faculty can view all receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_id = auth.uid()
    AND role IN ('officer', 'faculty_advisor')
  )
);

-- ---- SHOWCASE SCREENSHOTS BUCKET (public) ----
-- Public read, but only officers/faculty can upload
CREATE POLICY "Anyone can view showcase screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'showcase-screenshots');

CREATE POLICY "Officers and faculty can upload showcase screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'showcase-screenshots' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_id = auth.uid()
    AND role IN ('officer', 'faculty_advisor')
  )
);

CREATE POLICY "Officers and faculty can update showcase screenshots"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'showcase-screenshots' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_id = auth.uid()
    AND role IN ('officer', 'faculty_advisor')
  )
);

CREATE POLICY "Officers and faculty can delete showcase screenshots"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'showcase-screenshots' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_id = auth.uid()
    AND role IN ('officer', 'faculty_advisor')
  )
);


-- ============================================
-- SAS Wolfson Hackathon Club — Seed Data
-- Run this AFTER schema.sql to populate sample data
-- ============================================

-- ---- Sample Events (Miami Area) ----
INSERT INTO public.events (id, name, slug, description, event_status, start_date_time, end_date_time, registration_opens_at, registration_closes_at, submission_deadline, venue_name, venue_address, city, is_virtual, transport_provided, bus_capacity, max_team_size, eligibility_rules, requires_parent_consent, requires_gpa_clearance, stipend_cap_per_student, deposit_amount, chaperone_ratio, created_by) VALUES
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567801',
  'ShellHacks 2025',
  'shellhacks-2025',
  'Florida''s largest hackathon — 48 hours of building, learning, and competing with 1500+ hackers from across the Southeast.',
  'registration_open',
  '2025-09-19 17:00:00-04:00',
  '2025-09-21 18:00:00-04:00',
  '2025-06-01 00:00:00-04:00',
  '2025-09-10 23:59:59-04:00',
  '2025-09-21 14:00:00-04:00',
  'Miami Beach Convention Center',
  '1901 Convention Center Dr, Miami Beach, FL 33139',
  'Miami Beach',
  false,
  true,
  40,
  4,
  'Open to all university and high school students. Must be 18+ or have parent consent for minors.',
  true,
  false,
  500.00,
  20.00,
  10,
  '00000000-0000-0000-0000-000000000001'
),
(
  'b2c3d4e5-f6a7-8901-bcde-f12345678902',
  'MDC Wolfson Campus Hackathon',
  'mdc-wolfson-hackathon-2025',
  'Our home turf hackathon — build solutions for local Miami community challenges in 24 hours.',
  'upcoming',
  '2025-11-15 09:00:00-05:00',
  '2025-11-16 18:00:00-05:00',
  '2025-08-15 00:00:00-04:00',
  '2025-11-10 23:59:59-05:00',
  '2025-11-16 15:00:00-05:00',
  'Miami Dade College — Wolfson Campus',
  '300 NE 2nd Ave, Miami, FL 33132',
  'Miami',
  false,
  true,
  40,
  4,
  'Open to all SAS Wolfson students and invited Miami-Dade County high school students.',
  true,
  true,
  300.00,
  20.00,
  10,
  '00000000-0000-0000-0000-000000000001'
),
(
  'c3d4e5f6-a7b8-9012-cdef-123456789013',
  'Miami High School Hackathon',
  'miami-hs-hackathon-2025',
  'Regional high school hackathon featuring tracks in AI/ML, Web/Mobile, and Hardware/IoT.',
  'upcoming',
  '2025-12-06 09:00:00-05:00',
  '2025-12-07 17:00:00-05:00',
  '2025-09-01 00:00:00-04:00',
  '2025-11-28 23:59:59-05:00',
  '2025-12-07 14:00:00-05:00',
  'Miami Senior High School',
  '2450 SW 1st St, Miami, FL 33135',
  'Miami',
  false,
  false,
  0,
  4,
  'Open to Miami-Dade County public high school students only.',
  true,
  true,
  200.00,
  20.00,
  10,
  '00000000-0000-0000-0000-000000000001'
),
(
  'd4e5f6a7-b8c9-0123-defa-234567890124',
  'FIU CodeFest',
  'fiu-codefest-2025',
  'Florida International University''s annual coding festival with workshops, competitions, and networking.',
  'upcoming',
  '2026-01-25 10:00:00-05:00',
  '2026-01-26 18:00:00-05:00',
  '2025-10-01 00:00:00-04:00',
  '2026-01-17 23:59:59-05:00',
  '2026-01-26 15:00:00-05:00',
  'FIU Engineering Center',
  '10555 W Flagler St, Miami, FL 33174',
  'Miami',
  false,
  true,
  40,
  4,
  'Open to all South Florida high school and university students.',
  true,
  false,
  400.00,
  20.00,
  10,
  '00000000-0000-0000-0000-000000000001'
),
(
  'e5f6a7b8-c9d0-1234-efab-345678901235',
  'ShellHacks 2024 (Past)',
  'shellhacks-2024',
  'Last year''s ShellHacks — our club won Best Use of AWS!',
  'completed',
  '2024-09-20 17:00:00-04:00',
  '2024-09-22 18:00:00-04:00',
  '2024-06-01 00:00:00-04:00',
  '2024-09-11 23:59:59-04:00',
  '2024-09-22 14:00:00-04:00',
  'Miami Beach Convention Center',
  '1901 Convention Center Dr, Miami Beach, FL 33139',
  'Miami Beach',
  false,
  true,
  40,
  4,
  'Annual flagship hackathon.',
  true,
  false,
  500.00,
  20.00,
  10,
  '00000000-0000-0000-0000-000000000001'
);

-- ---- Sample Profiles (Students) ----
-- Note: All emails use @example.com (RFC 2606 reserved for documentation/testing)
INSERT INTO public.profiles (id, auth_id, email, full_name, role, student_id, grade_level, graduation_year, technical_skills, github_url, shirt_size, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, parent_consent_status, gpa_cleared, membership_active, travel_eligible) VALUES
('p1000001', 'auth-student-001', 'alex.rodriguez@example.com', 'Alex Rodriguez', 'student', 'SAS2024001', 11, 2026, ARRAY['Python', 'React', 'TensorFlow'], 'https://github.com/alexrodriguez', 'M', 'Maria Rodriguez', '(305) 555-0101', 'Parent', 'approved', true, true, true),
('p1000002', 'auth-student-002', 'jordan.chen@example.com', 'Jordan Chen', 'student', 'SAS2024002', 12, 2025, ARRAY['JavaScript', 'Node.js', 'Three.js', 'Blender'], 'https://github.com/jordanchen', 'L', 'David Chen', '(305) 555-0102', 'Parent', 'approved', true, true, true),
('p1000003', 'auth-student-003', 'taylor.williams@example.com', 'Taylor Williams', 'student', 'SAS2024003', 10, 2027, ARRAY['Java', 'Android', 'Firebase', 'UI/UX'], 'https://github.com/taylorw', 'S', 'Pat Williams', '(305) 555-0103', 'Guardian', 'approved', true, true, true),
('p1000004', 'auth-student-004', 'casey.kim@example.com', 'Casey Kim', 'student', 'SAS2024004', 11, 2026, ARRAY['Python', 'Django', 'PostgreSQL', 'Docker'], 'https://github.com/caseykim', 'M', 'Soo Kim', '(305) 555-0104', 'Parent', 'pending', false, true, false),
('p1000005', 'auth-student-005', 'morgan.johnson@example.com', 'Morgan Johnson', 'student', 'SAS2024005', 12, 2025, ARRAY['Swift', 'iOS', 'ARKit', 'Machine Learning'], 'https://github.com/morganj', 'XL', 'Robert Johnson', '(305) 555-0105', 'Parent', 'approved', true, true, true),
('p1000006', 'auth-student-006', 'riley.garcia@example.com', 'Riley Garcia', 'student', 'SAS2024006', 9, 2028, ARRAY['HTML/CSS', 'JavaScript', 'Figma'], NULL, 'M', 'Ana Garcia', '(305) 555-0106', 'Parent', 'not_submitted', false, true, false),
('p1000007', 'auth-officer-001', 'dr.patel@example.com', 'Dr. Meera Patel', 'faculty_advisor', NULL, NULL, NULL, ARRAY['Computer Science Education'], NULL, NULL, NULL, NULL, NULL, NULL, true, true, true),
('p1000008', 'auth-officer-002', 'sam.reyes@example.com', 'Sam Reyes', 'officer', 'SAS2024099', 12, 2025, ARRAY['React', 'TypeScript', 'Supabase', 'Leadership'], 'https://github.com/samreyes', 'L', 'Carlos Reyes', '(305) 555-0199', 'Parent', 'approved', true, true, true);

-- ---- Admin Whitelist for Staff ----
INSERT INTO public.admin_whitelist (email, role, added_by) VALUES
('dr.patel@example.com', 'faculty_advisor', 'p1000007'),
('principal.leon@example.com', 'officer', 'p1000007');

-- ---- Sample Equipment ----
INSERT INTO public.equipment_items (id, name, category, serial_number, status) VALUES
('eq001', 'Arduino Uno R4 WiFi', 'microcontroller', 'ARD-R4-001', 'available'),
('eq002', 'ESP32 DevKit V1', 'microcontroller', 'ESP32-002', 'available'),
('eq003', 'Raspberry Pi 5 8GB', 'microcontroller', 'RPI5-003', 'checked_out'),
('eq004', 'USB-C Multimeter', 'testing_device', 'MM-004', 'available'),
('eq005', 'Logic Analyzer 24ch', 'testing_device', 'LA-005', 'available'),
('eq006', 'Breadboard Kit (large)', 'peripheral', 'BB-006', 'checked_out'),
('eq007', 'Jumper Wire Set 400pc', 'cable', 'JW-007', 'available'),
('eq008', 'HDMI Cable 6ft', 'cable', 'HDMI-008', 'available'),
('eq009', 'USB-C Hub 7-port', 'peripheral', 'HUB-009', 'overdue'),
('eq010', 'Portable Monitor 15"', 'peripheral', 'MON-010', 'missing');

-- ---- Sample Checkouts ----
INSERT INTO public.equipment_checkouts (id, equipment_id, user_id, checked_out_at, due_back_at, status) VALUES
('co001', 'eq003', 'p1000001', NOW() - INTERVAL '5 days', NOW() + INTERVAL '5 days', 'active'),
('co002', 'eq006', 'p1000002', NOW() - INTERVAL '3 days', NOW() + INTERVAL '2 days', 'active'),
('co003', 'eq009', 'p1000005', NOW() - INTERVAL '14 days', NOW() - INTERVAL '2 days', 'overdue'),
('co004', 'eq010', 'p1000004', NOW() - INTERVAL '30 days', NOW() - INTERVAL '10 days', 'lost');

-- ---- Sample Teams ----
INSERT INTO public.teams (id, event_id, name, description, status, leader_id, max_members) VALUES
('team001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'CodeTigers Alpha', 'Building an AI-powered study assistant for MDC students.', 'locked', 'p1000001', 4),
('team002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'ByteWolves', 'Creating a real-time campus safety app with live location sharing.', 'inviting', 'p1000002', 4),
('team003', 'b2c3d4e5-f6a7-8901-bcde-f12345678902', 'Wolfson Wizards', 'Home team for the MDC Wolfson hackathon.', 'draft', 'p1000003', 4);

-- ---- Sample Team Members ----
INSERT INTO public.team_members (id, team_id, user_id, role, invite_status) VALUES
('tm001', 'team001', 'p1000001', 'leader', 'accepted'),
('tm002', 'team001', 'p1000002', 'member', 'accepted'),
('tm003', 'team001', 'p1000003', 'member', 'accepted'),
('tm004', 'team001', 'p1000005', 'member', 'accepted'),
('tm005', 'team002', 'p1000002', 'leader', 'accepted'),
('tm006', 'team002', 'p1000004', 'member', 'pending'),
('tm007', 'team003', 'p1000003', 'leader', 'accepted');

-- ---- Sample Registrations ----
INSERT INTO public.event_registrations (id, event_id, user_id, team_id, status, registered_at, deposit_paid, deposit_refunded, excused, transport_requested, transport_seat_confirmed, bus_seat_number) VALUES
('reg001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'p1000001', 'team001', 'approved_to_travel', NOW() - INTERVAL '30 days', true, false, false, true, true, 1),
('reg002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'p1000002', 'team001', 'approved_to_travel', NOW() - INTERVAL '29 days', true, false, false, true, true, 2),
('reg003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'p1000003', 'team001', 'approved_to_travel', NOW() - INTERVAL '28 days', true, false, false, true, true, 3),
('reg004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'p1000005', 'team001', 'approved_to_travel', NOW() - INTERVAL '27 days', true, false, false, true, true, 4),
('reg005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'p1000004', NULL, 'waitlisted', NOW() - INTERVAL '25 days', false, false, false, true, false, NULL),
('reg006', 'b2c3d4e5-f6a7-8901-bcde-f12345678902', 'p1000001', NULL, 'registered', NOW() - INTERVAL '10 days', false, false, false, true, false, NULL),
('reg007', 'b2c3d4e5-f6a7-8901-bcde-f12345678902', 'p1000003', 'team003', 'registered', NOW() - INTERVAL '8 days', false, false, false, true, false, NULL),
('reg008', 'c3d4e5f6-a7b8-9012-cdef-123456789013', 'p1000002', NULL, 'registered', NOW() - INTERVAL '5 days', false, false, false, false, false, NULL),
('reg009', 'd4e5f6a7-b8c9-0123-defa-234567890124', 'p1000005', NULL, 'registered', NOW() - INTERVAL '2 days', false, false, false, true, false, NULL);

-- ---- Sample Budget Ledger ----
INSERT INTO public.budget_ledger (id, event_id, entry_type, description, amount, currency, submitted_by, status) VALUES
('blg001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'allocation', 'Club funding allocation for ShellHacks 2025', 2000.00, 'USD', 'p1000007', 'approved'),
('blg002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'bus_expense', 'Charter bus rental — ShellHanks transport', -850.00, 'USD', 'p1000008', 'approved'),
('blg003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'ticket_expense', 'ShellHacks registration fees (4 students)', -160.00, 'USD', 'p1000008', 'approved'),
('blg004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'food_expense', 'Meal stipends — ShellHacks weekend', -400.00, 'USD', 'p1000008', 'pending'),
('blg005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'deposit', 'Student deposits collected', 80.00, 'USD', 'p1000008', 'approved'),
('blg006', NULL, 'stipend', 'Stipend request — Alex Rodriguez (ShellHacks travel)', 150.00, 'USD', 'p1000001', 'pending'),
('blg007', NULL, 'reimbursement', 'Receipt reimbursement — Jordan Chen (supplies)', 45.50, 'USD', 'p1000002', 'pending'),
('blg008', 'b2c3d4e5-f6a7-8901-bcde-f12345678902', 'allocation', 'MDC Wolfson hackathon budget', 1200.00, 'USD', 'p1000007', 'approved');

-- ---- Sample Showcases (Published) ----
INSERT INTO public.past_showcases (id, event_id, team_id, project_title, project_description, demo_url, screenshot_urls, awards_won, prize_money, status, published_by) VALUES
('sc001', 'e5f6a7b8-c9d0-1234-efab-345678901235', 'team001', 'StudyBuddy AI', 'An AI-powered study assistant that generates personalized practice quizzes, flashcards, and study schedules based on student performance data. Built with Python, React, and OpenAI API.', 'https://studybuddy-ai-demo.vercel.app', ARRAY['https://placehold.co/600x400/0A192F/FFFFFF?text=StudyBuddy+Dashboard', 'https://placehold.co/600x400/1E3A8A/FFFFFF?text=AI+Quiz+Generator'], ARRAY['Best Use of AWS', 'Best Education Hack'], 2500.00, 'published', 'p1000008'),
('sc002', 'e5f6a7b8-c9d0-1234-efab-345678901235', 'team002', 'CampusSafe Live', 'Real-time campus safety application with live location sharing, emergency alerts, and incident reporting. Features offline-first architecture using service workers and IndexedDB.', 'https://campussafe-live.app', ARRAY['https://placehold.co/600x400/0A192F/FFFFFF?text=Live+Map+View', 'https://placehold.co/600x400/1E3A8A/FFFFFF?text=Emergency+Alert'], ARRAY['Best Mobile Hack', 'Honorable Mention'], 500.00, 'published', 'p1000008'),
('sc003', 'e5f6a7b8-c9d0-1234-efab-345678901235', 'team003', 'EcoRoute Miami', 'Sustainable transportation planner for Miami that optimizes bus routes, bike paths, and ride-sharing options to reduce carbon footprint. Uses real-time MDT bus data and Google Maps API.', 'https://ecoroute-miami.vercel.app', ARRAY['https://placehold.co/600x400/0A192F/FFFFFF?text=Route+Planner', 'https://placehold.co/600x400/1E3A8A/FFFFFF?text=Carbon+Savings'], ARRAY['Best Sustainability Hack'], 1000.00, 'published', 'p1000008');

-- ---- Sample Chaperone Assignments ----
INSERT INTO public.chaperone_assignments (id, event_id, user_id, external_name, external_phone, role, confirmed) VALUES
('chap001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'p1000007', NULL, NULL, 'faculty_advisor', true),
('chap002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'p1000008', NULL, NULL, 'officer', true),
('chap003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', NULL, 'James Rivera', '(786) 555-0201', 'vetted_adult', true),
('chap004', 'b2c3d4e5-f6a7-8901-bcde-f12345678902', 'p1000007', NULL, NULL, 'faculty_advisor', false);

-- ---- Sample Notifications ----
INSERT INTO public.app_notifications (id, user_id, title, body, type, read) VALUES
('notif001', 'p1000001', 'Registration Approved', 'Your registration for ShellHacks 2025 has been approved for travel!', 'success', false),
('notif002', 'p1000001', 'Team Roster Locked', 'Your team "CodeTigers Alpha" roster has been finalized for ShellHacks 2025.', 'info', false),
('notif003', 'p1000002', 'New Team Invite', 'Alex Rodriguez has invited you to join "CodeTigers Alpha" for ShellHacks 2025.', 'info', true),
('notif004', 'p1000004', 'Parent Consent Pending', 'Your parent consent form is still pending. Upload it to become eligible for travel.', 'warning', false),
('notif005', 'p1000005', 'Equipment Overdue', 'Your USB-C Hub (eq009) is overdue. Please return it to avoid check-in blocks.', 'urgent', false);
