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
