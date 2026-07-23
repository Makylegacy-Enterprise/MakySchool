'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { disciplineApi, type DisciplineListParams } from '@/lib/api/discipline';
import type { CreateDisciplineIncidentPayload } from '@makyschool/shared';
import { DEFAULT_PAGE_SIZE } from '@makyschool/shared/constants';

export const disciplineKeys = {
  list: (filters: string) => ['discipline', 'list', filters] as const,
  mine: (key: string) => ['discipline', 'mine', key] as const,
  student: (studentId: string, termId: string) =>
    ['discipline', 'student', studentId, termId] as const,
  flags: (termId: string) => ['discipline', 'flags', termId] as const,
};

export function useDisciplineList(filters: DisciplineListParams, enabled = true) {
  const key = JSON.stringify(filters);
  return useQuery({
    queryKey: disciplineKeys.list(key),
    queryFn: () =>
      disciplineApi.list({
        ...filters,
        page: filters.page ?? 1,
        limit: filters.limit ?? DEFAULT_PAGE_SIZE,
      }),
    enabled,
    staleTime: 30_000,
  });
}

export function useMyDisciplineIncidents(
  params: { termId?: string; page?: number; limit?: number } = {},
  enabled = true,
) {
  const key = JSON.stringify(params);
  return useQuery({
    queryKey: disciplineKeys.mine(key),
    queryFn: () =>
      disciplineApi.listMine({
        termId: params.termId,
        page: params.page ?? 1,
        limit: params.limit ?? DEFAULT_PAGE_SIZE,
      }),
    enabled,
    staleTime: 30_000,
  });
}

export function useStudentDiscipline(
  studentId: string,
  termId = '',
  enabled = true,
) {
  return useQuery({
    queryKey: disciplineKeys.student(studentId, termId),
    queryFn: () => disciplineApi.getStudent(studentId, termId || undefined),
    enabled: enabled && !!studentId,
    staleTime: 30_000,
  });
}

export function useRepeatOffenders(termId = '', enabled = true) {
  return useQuery({
    queryKey: disciplineKeys.flags(termId),
    queryFn: () => disciplineApi.getRepeatOffenders(termId || undefined),
    enabled,
    staleTime: 60_000,
  });
}

export function useCreateDisciplineIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDisciplineIncidentPayload) =>
      disciplineApi.create(payload),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['discipline'] });
      qc.invalidateQueries({
        queryKey: ['discipline', 'student', vars.studentId],
      });
    },
  });
}

export function useAddDisciplineRemarks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { incidentId: string; remarks: string }) =>
      disciplineApi.addRemarks(args.incidentId, args.remarks),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['discipline'] });
    },
  });
}

export function useVoidDisciplineIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { incidentId: string; reason: string }) =>
      disciplineApi.voidIncident(args.incidentId, args.reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['discipline'] });
    },
  });
}
