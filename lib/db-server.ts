import { createClient } from '@supabase/supabase-js';
import { db } from './db';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isServerSupabaseReady = 
  supabaseUrl && 
  supabaseUrl !== 'https://placeholder.supabase.co' && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  serviceRoleKey && 
  serviceRoleKey !== 'your-anon-key-here' &&
  serviceRoleKey !== 'your-supabase-service-role-key';

export const serverSupabase = isServerSupabaseReady
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

export const serverDb = {
  isConfigured: () => Boolean(serverSupabase),

  // Student queries
  getStudentByPhoneOrEmail: async (identifier: string) => {
    if (serverSupabase) {
      const cleanPhone = identifier.replace(/[^0-9]/g, '');
      const { data, error } = await serverSupabase
        .from('students')
        .select('*')
        .or(`phone.eq.${cleanPhone},email.eq.${identifier}`)
        .single();
      if (!error && data) return data;
    }
    return db.findUserAccount(identifier);
  },

  // Record audit log
  recordAuditLog: async (log: {
    actorEmail?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    ipAddress?: string;
    metadata?: any;
  }) => {
    if (serverSupabase) {
      await serverSupabase.from('audit_logs').insert([log]);
    } else {
      console.log(`[AUDIT LOG] ${new Date().toISOString()} | ${log.actorEmail || 'anonymous'} | ${log.action} | ${log.resourceType}:${log.resourceId || ''}`);
    }
  },
};

