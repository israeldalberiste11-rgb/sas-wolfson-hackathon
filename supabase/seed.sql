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
  300 NE 2nd Ave, Miami, FL 33132',
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
  2450 SW 1st St, Miami, FL 33135',
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
  10555 W Flagler St, Miami, FL 33174',
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
-- Note: auth_id would be real Supabase Auth UUIDs; these are placeholders
INSERT INTO public.profiles (id, auth_id, email, full_name, role, student_id, grade_level, graduation_year, technical_skills, github_url, shirt_size, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, parent_consent_status, gpa_cleared, membership_active, travel_eligible) VALUES
('p1000001', 'auth-student-001', 'alex.rodriguez@students.dadeschools.net', 'Alex Rodriguez', 'student', 'SAS2024001', 11, 2026, ARRAY['Python', 'React', 'TensorFlow'], 'https://github.com/alexrodriguez', 'M', 'Maria Rodriguez', '(305) 555-0101', 'Parent', 'approved', true, true, true),
('p1000002', 'auth-student-002', 'jordan.chen@students.dadeschools.net', 'Jordan Chen', 'student', 'SAS2024002', 12, 2025, ARRAY['JavaScript', 'Node.js', 'Three.js', 'Blender'], 'https://github.com/jordanchen', 'L', 'David Chen', '(305) 555-0102', 'Parent', 'approved', true, true, true),
('p1000003', 'auth-student-003', 'taylor.williams@students.dadeschools.net', 'Taylor Williams', 'student', 'SAS2024003', 10, 2027, ARRAY['Java', 'Android', 'Firebase', 'UI/UX'], 'https://github.com/taylorw', 'S', 'Pat Williams', '(305) 555-0103', 'Guardian', 'approved', true, true, true),
('p1000004', 'auth-student-004', 'casey.kim@students.dadeschools.net', 'Casey Kim', 'student', 'SAS2024004', 11, 2026, ARRAY['Python', 'Django', 'PostgreSQL', 'Docker'], 'https://github.com/caseykim', 'M', 'Soo Kim', '(305) 555-0104', 'Parent', 'pending', false, true, false),
('p1000005', 'auth-student-005', 'morgan.johnson@students.dadeschools.net', 'Morgan Johnson', 'student', 'SAS2024005', 12, 2025, ARRAY['Swift', 'iOS', 'ARKit', 'Machine Learning'], 'https://github.com/morganj', 'XL', 'Robert Johnson', '(305) 555-0105', 'Parent', 'approved', true, true, true),
('p1000006', 'auth-student-006', 'riley.garcia@students.dadeschools.net', 'Riley Garcia', 'student', 'SAS2024006', 9, 2028, ARRAY['HTML/CSS', 'JavaScript', 'Figma'], NULL, 'M', 'Ana Garcia', '(305) 555-0106', 'Parent', 'not_submitted', false, true, false),
('p1000007', 'auth-officer-001', 'ms.patel@dadeschools.net', 'Dr. Meera Patel', 'faculty_advisor', NULL, NULL, NULL, ARRAY['Computer Science Education'], NULL, NULL, NULL, NULL, NULL, NULL, true, true, true),
('p1000008', 'auth-officer-002', 'sam.reyes@students.dadeschools.net', 'Sam Reyes', 'officer', 'SAS2024099', 12, 2025, ARRAY['React', 'TypeScript', 'Supabase', 'Leadership'], 'https://github.com/samreyes', 'L', 'Carlos Reyes', '(305) 555-0199', 'Parent', 'approved', true, true, true);

-- ---- Admin Whitelist for Staff ----
INSERT INTO public.admin_whitelist (email, role, added_by) VALUES
('ms.patel@dadeschools.net', 'faculty_advisor', 'p1000007'),
('principal.leon@dadeschools.net', 'officer', 'p1000007');

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
