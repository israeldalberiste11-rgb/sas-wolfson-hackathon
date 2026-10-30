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
  first_name TEXT GENERATED ALWAYS AS (split_part(full_name, ' ', 1)) STORED,
  last_name TEXT GENERATED ALWAYS AS (
    CASE WHEN array_length(string_to_array(full_name, ' '), 1) > 1
    THEN array_to_string(string_to_array(full_name, ' '))[2:array_length(string_to_array(full_name, ' '), 1)], ' ')
    ELSE '' END
  ) STORED,
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
  SELECT ARRAY_AGG(first_name) INTO names
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
-- STORAGE BUCKETS (run in Supabase Dashboard or Edge Function)
-- ============================================
-- These are typically created via dashboard or SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('consent-forms', 'consent-forms', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('showcase-screenshots', 'showcase-screenshots', true);

-- Storage policies would be set up similarly with RLS on storage.objects
