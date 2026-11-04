import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Database Schema & RLS Policy Verification', () => {
  const schemaPath = path.join(process.cwd(), 'lib', 'schema.sql');
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

  const requiredTables = [
    'settings',
    'users',
    'courses',
    'teachers',
    'batches',
    'enquiries',
    'trial_registrations',
    'students',
    'attendance',
    'test_results',
    'fee_payments',
    'expenses',
    'ptm_bookings',
    'leave_requests',
    'student_doubts',
    'announcements',
    'study_materials',
    'audit_logs',
  ];

  test('verifies all critical production tables are defined', () => {
    for (const table of requiredTables) {
      assert.ok(
        schemaContent.includes(`CREATE TABLE IF NOT EXISTS public.${table}`),
        `Table public.${table} must be defined in schema.sql`
      );
    }
  });

  test('verifies Row Level Security is explicitly enabled on all tables', () => {
    for (const table of requiredTables) {
      assert.ok(
        schemaContent.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`),
        `RLS must be enabled on table public.${table}`
      );
    }
  });

  test('verifies role definition includes ADMIN, TEACHER, STUDENT, and PARENT', () => {
    assert.ok(
      schemaContent.includes("CHECK (role IN ('ADMIN', 'TEACHER', 'STUDENT', 'PARENT'))"),
      'Users table role check must include PARENT'
    );
  });

  test('verifies Parent RLS policies are present', () => {
    assert.ok(
      schemaContent.includes('CREATE POLICY "Parent read child attendance"'),
      'Parent attendance RLS policy must be defined'
    );
    assert.ok(
      schemaContent.includes('CREATE POLICY "Parent read child marks"'),
      'Parent marks RLS policy must be defined'
    );
    assert.ok(
      schemaContent.includes('CREATE POLICY "Parent read child fees"'),
      'Parent fee payment RLS policy must be defined'
    );
  });

  test('verifies private storage bucket security rules', () => {
    assert.ok(
      schemaContent.includes("'student-documents', 'student-documents', false"),
      'Student documents bucket must be private (public = false)'
    );
    assert.ok(
      schemaContent.includes("'fee-receipts', 'fee-receipts', false"),
      'Fee receipts bucket must be private (public = false)'
    );
  });
});
