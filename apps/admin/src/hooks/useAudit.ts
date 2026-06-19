import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../lib/api';

export interface AuditRow {
  id: number;
  actorType: string;
  actorUserId: number | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  amountMinor: number | null;
  ip: string | null;
  metadata: string | null;
  createdAt: string;
}

export function useAudit() {
  const { data, isLoading } = useQuery<AuditRow[]>({
    queryKey: ['audit'],
    queryFn: () => auditApi.list(100),
  });
  return { logs: data || [], isLoading };
}
