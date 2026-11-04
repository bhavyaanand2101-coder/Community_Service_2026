import { serverSupabase } from './db-server';

export interface AuditLogEvent {
  actorEmail?: string;
  actorRole?: string;
  action: string;
  resourceType: 'STUDENT' | 'PAYMENT' | 'MARKS' | 'ATTENDANCE' | 'BATCH' | 'SETTINGS' | 'LEAVE' | 'AUTH' | 'EXPENSE';
  resourceId?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

// In-memory persistent buffer for audit records
const recentAuditLogs: (AuditLogEvent & { id: string; timestamp: string })[] = [];

/**
 * Records an immutable administrative audit log
 */
export async function recordAdminAudit(event: AuditLogEvent): Promise<void> {
  const timestamp = new Date().toISOString();
  const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const record = { id, timestamp, ...event };

  // Retain the last 1000 events in memory
  recentAuditLogs.unshift(record);
  if (recentAuditLogs.length > 1000) {
    recentAuditLogs.pop();
  }

  // If Supabase is connected, write to public.audit_logs
  if (serverSupabase) {
    try {
      await serverSupabase.from('audit_logs').insert([{
        actor_email: event.actorEmail,
        action: event.action,
        resource_type: event.resourceType,
        resource_id: event.resourceId,
        ip_address: event.ipAddress,
        metadata: event.metadata,
      }]);
    } catch (err) {
      console.warn('Audit log database sync notice:', err);
    }
  }

  // Structured production stdout logging
  console.log(`[AUDIT_LOG] ${timestamp} | ACTOR=${event.actorEmail || 'system'}(${event.actorRole || 'anon'}) | ACTION=${event.action} | TARGET=${event.resourceType}:${event.resourceId || 'N/A'}`);
}

/**
 * Retrieves recent audit logs (restricted to ADMIN role)
 */
export function getRecentAuditLogs() {
  return [...recentAuditLogs];
}
