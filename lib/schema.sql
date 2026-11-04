-- ==============================================================================
-- PRIME LEARNING COACHING INSTITUTE DATABASE SCHEMA FOR SUPABASE / POSTGRESQL
-- Production Hardened Schema with Row Level Security (RLS) & Role-Based Policies
-- ==============================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. INSTITUTE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL DEFAULT 'Prime Learning Classes',
    tagline VARCHAR(255) DEFAULT 'Maths, Science & All-Subject Tutoring | Quality Coaching & Personal Attention',
    location_name VARCHAR(255) DEFAULT 'Sec-22B, Gurgaon',
    address TEXT DEFAULT '948, Sec-22B, Near Anand Farm, Gurgaon',
    landmark VARCHAR(255) DEFAULT 'Near Anand Farm',
    phone VARCHAR(50) DEFAULT '+91 98109 89437',
    whatsapp_number VARCHAR(50) DEFAULT '+919810989437',
    email VARCHAR(255) DEFAULT 'info@primelearning.edu.in',
    opening_hours VARCHAR(255) DEFAULT 'Mon - Sat: 3:00 PM - 8:30 PM | Sun: 9:00 AM - 1:00 PM',
    google_maps_embed_url TEXT,
    whatsapp_community_url TEXT,
    trial_slots_available INT DEFAULT 8,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. USERS & ROLES TABLE (Admin, Teacher, Student, Parent)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'TEACHER', 'STUDENT', 'PARENT')),
    phone VARCHAR(50),
    associated_id VARCHAR(100),
    auth_provider VARCHAR(50) DEFAULT 'credentials',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. COURSES TABLE
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grade VARCHAR(100) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    description TEXT,
    batch_timing VARCHAR(255),
    monthly_fee VARCHAR(100),
    available_seats INT DEFAULT 10,
    status VARCHAR(50) DEFAULT 'Open' CHECK (status IN ('Open', 'Fast Filling', 'Full')),
    highlights TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TEACHERS TABLE
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    qualification VARCHAR(255),
    experience VARCHAR(255),
    subjects TEXT[],
    classes_taught TEXT[],
    teaching_philosophy TEXT,
    areas_of_expertise TEXT[],
    achievements TEXT[],
    photo_url TEXT,
    bio TEXT,
    email VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. BATCHES TABLE
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    grade VARCHAR(100) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    days VARCHAR(100),
    start_time VARCHAR(50),
    end_time VARCHAR(50),
    room VARCHAR(100),
    max_students INT DEFAULT 15,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Full')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. ENQUIRIES TABLE (CRM Pipeline)
CREATE TABLE IF NOT EXISTS public.enquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    grade VARCHAR(100),
    subject VARCHAR(100),
    preferred_timing VARCHAR(100),
    message TEXT,
    status VARCHAR(50) DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Trial Scheduled', 'Trial Completed', 'Enrolled', 'Not Interested')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TRIAL REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS public.trial_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_name VARCHAR(255) NOT NULL,
    parent_name VARCHAR(255) NOT NULL,
    grade VARCHAR(100) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    whatsapp VARCHAR(50),
    preferred_timing VARCHAR(100),
    preferred_teacher VARCHAR(255),
    trial_date DATE,
    status VARCHAR(50) DEFAULT 'Registered' CHECK (status IN ('Registered', 'Contacted', 'Scheduled', 'Attended', 'Absent', 'Converted', 'Not Converted')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_name VARCHAR(255) NOT NULL,
    parent_name VARCHAR(255) NOT NULL,
    grade VARCHAR(100) NOT NULL,
    subjects TEXT[],
    phone VARCHAR(50) NOT NULL,
    whatsapp VARCHAR(50),
    email VARCHAR(255),
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    teacher_name VARCHAR(255),
    admission_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Trial', 'Completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Present', 'Absent')),
    check_in_method VARCHAR(50) DEFAULT 'MANUAL',
    check_in_time VARCHAR(50),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. TEST RESULTS TABLE
CREATE TABLE IF NOT EXISTS public.test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_name VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    grade VARCHAR(100),
    date DATE DEFAULT CURRENT_DATE,
    max_marks NUMERIC(5,2) NOT NULL,
    marks_obtained NUMERIC(5,2) NOT NULL,
    percentage NUMERIC(5,2) GENERATED ALWAYS AS ((marks_obtained / max_marks) * 100) STORED,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. FEE PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.fee_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    parent_name VARCHAR(255),
    course_title VARCHAR(255) NOT NULL,
    grade VARCHAR(100) NOT NULL,
    amount VARCHAR(50) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'UPI',
    month_paid_for VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'PAID' CHECK (status IN ('PAID', 'PENDING', 'OVERDUE')),
    transaction_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. EXPENSES TABLE (Admin Financial Accounting)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL CHECK (category IN ('Rent', 'Electricity & Utilities', 'Printing & Xerox', 'Study Material & Books', 'Faculty Stipend', 'Software & Tech', 'Refreshments', 'Maintenance', 'Other')),
    amount NUMERIC(10,2) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    paid_to VARCHAR(255),
    payment_method VARCHAR(50) DEFAULT 'UPI',
    receipt_ref VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. PTM BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.ptm_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    parent_name VARCHAR(255) NOT NULL,
    parent_phone VARCHAR(50) NOT NULL,
    preferred_teacher VARCHAR(255) NOT NULL,
    preferred_slot VARCHAR(255) NOT NULL,
    concern_area TEXT,
    status VARCHAR(50) DEFAULT 'CONFIRMED' CHECK (status IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. LEAVE REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    grade VARCHAR(100) NOT NULL,
    parent_phone VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. STUDENT DOUBTS TABLE
CREATE TABLE IF NOT EXISTS public.student_doubts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    question TEXT NOT NULL,
    ai_hint TEXT,
    teacher_reply TEXT,
    status VARCHAR(50) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'AI_ANSWERED', 'RESOLVED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_grade VARCHAR(100) DEFAULT 'All',
    author VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. STUDY MATERIALS TABLE
CREATE TABLE IF NOT EXISTS public.study_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    grade VARCHAR(100) NOT NULL,
    file_type VARCHAR(50) DEFAULT 'PDF',
    download_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 18. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    actor_email VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100),
    ip_address VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE & FAST LOOKUPS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_students_phone ON public.students(phone);
CREATE INDEX IF NOT EXISTS idx_students_batch ON public.students(batch_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_test_results_student ON public.test_results(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON public.fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_ptm_student ON public.ptm_bookings(student_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS across EVERY table in public schema
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ptm_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_doubts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Public Read Policies for Marketing & Institutional Pages
CREATE POLICY "Public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Public read courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Public read teachers" ON public.teachers FOR SELECT USING (true);
CREATE POLICY "Public read announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Public read materials" ON public.study_materials FOR SELECT USING (true);

-- 2. Public Insert Policies for Leads & Trials
CREATE POLICY "Public insert enquiries" ON public.enquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert trial registrations" ON public.trial_registrations FOR INSERT WITH CHECK (true);

-- 3. Admin Full Access Policy (Service Role & Authenticated Admins)
CREATE POLICY "Admin full access settings" ON public.settings FOR ALL USING (auth.jwt()->>'role' = 'ADMIN');
CREATE POLICY "Admin full access users" ON public.users FOR ALL USING (auth.jwt()->>'role' = 'ADMIN');
CREATE POLICY "Admin full access courses" ON public.courses FOR ALL USING (auth.jwt()->>'role' = 'ADMIN');
CREATE POLICY "Admin full access teachers" ON public.teachers FOR ALL USING (auth.jwt()->>'role' = 'ADMIN');
CREATE POLICY "Admin full access batches" ON public.batches FOR ALL USING (auth.jwt()->>'role' = 'ADMIN');
CREATE POLICY "Admin full access enquiries" ON public.enquiries FOR ALL USING (auth.jwt()->>'role' = 'ADMIN');
CREATE POLICY "Admin full access trials" ON public.trial_registrations FOR ALL USING (auth.jwt()->>'role' = 'ADMIN');
CREATE POLICY "Admin full access students" ON public.students FOR ALL USING (auth.jwt()->>'role' = 'ADMIN');
CREATE POLICY "Admin full access attendance" ON public.attendance FOR ALL USING (auth.jwt()->>'role' = 'ADMIN');
CREATE POLICY "Admin full access test_results" ON public.test_results FOR ALL USING (auth.jwt()->>'role' = 'ADMIN');
CREATE POLICY "Admin full access fee_payments" ON public.fee_payments FOR ALL USING (auth.jwt()->>'role' = 'ADMIN');
CREATE POLICY "Admin full access expenses" ON public.expenses FOR ALL USING (auth.jwt()->>'role' = 'ADMIN');
CREATE POLICY "Admin full access ptm_bookings" ON public.ptm_bookings FOR ALL USING (auth.jwt()->>'role' = 'ADMIN');
CREATE POLICY "Admin full access leave_requests" ON public.leave_requests FOR ALL USING (auth.jwt()->>'role' = 'ADMIN');
CREATE POLICY "Admin full access student_doubts" ON public.student_doubts FOR ALL USING (auth.jwt()->>'role' = 'ADMIN');
CREATE POLICY "Admin full access audit_logs" ON public.audit_logs FOR ALL USING (auth.jwt()->>'role' = 'ADMIN');

-- 4. Student RLS Policies (Students can strictly view their own records)
CREATE POLICY "Student read own profile" ON public.students FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Student read own attendance" ON public.attendance FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Student read own marks" ON public.test_results FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Student read own fees" ON public.fee_payments FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Student manage own doubts" ON public.student_doubts FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Student submit leave" ON public.leave_requests FOR INSERT WITH CHECK (auth.uid() = student_id);

-- 5. Parent RLS Policies (Parents can view only their registered student's records by phone)
CREATE POLICY "Parent read child attendance" ON public.attendance FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.students WHERE students.id = attendance.student_id AND students.phone = (auth.jwt()->>'phone'))
);
CREATE POLICY "Parent read child marks" ON public.test_results FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.students WHERE students.id = test_results.student_id AND students.phone = (auth.jwt()->>'phone'))
);
CREATE POLICY "Parent read child fees" ON public.fee_payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.students WHERE students.id = fee_payments.student_id AND students.phone = (auth.jwt()->>'phone'))
);
CREATE POLICY "Parent manage ptm" ON public.ptm_bookings FOR ALL USING (
    parent_phone = (auth.jwt()->>'phone')
);

-- ==============================================================================
-- 6. PRIVATE STORAGE BUCKET SECURITY RULES (Make storage buckets private)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('student-documents', 'student-documents', false),
       ('fee-receipts', 'fee-receipts', false),
       ('study-materials', 'study-materials', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage RLS: Restrict file uploads to verified faculty and admins
CREATE POLICY "Admin & Teacher upload files" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id IN ('student-documents', 'fee-receipts', 'study-materials') AND
  (auth.jwt()->>'role' IN ('ADMIN', 'TEACHER'))
);

-- Storage RLS: Authorized private file reads only
CREATE POLICY "Authorized read private files" ON storage.objects FOR SELECT USING (
  bucket_id = 'study-materials' OR 
  (auth.jwt()->>'role' = 'ADMIN') OR
  (auth.uid()::text = (storage.foldername(name))[1])
);

