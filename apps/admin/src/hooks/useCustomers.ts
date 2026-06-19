import { useQuery } from '@tanstack/react-query';
import { customersApi } from '../lib/api';

export interface CustomerRow {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  twoFactorMethod: string;
  createdAt: string;
}

export function useCustomers() {
  const { data, isLoading } = useQuery<CustomerRow[]>({
    queryKey: ['customers'],
    queryFn: () => customersApi.list(),
  });
  return { customers: data || [], isLoading };
}
