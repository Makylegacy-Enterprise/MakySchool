'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { disciplineApi } from '@/lib/api/discipline';
import type { CreateDisciplineIncidentPayload } from '@makyschool/shared';

export const disciplineKeys = {
  list: (filters: string) => ['discipline', 'list', filters] as const,
  mine: (termId: string) => ['discipline', 'mine', termId] as const,
  student: (studentId: string, termId: string) =>
    ['discipline', 'student', studentId, termId] as const,
  flags: (termId: string) => ['discipline', 'flags', termId] as const,
};

export function useDisciplineList(
  filters: {
    termId?: string;
    incidentType?: string;
    classId?: string;
    studentId?: string;
    dateFrom?: string;
    dateTo?: string;
  },
  enabled = true,
) {
  const key = JSON.stringify(filters);
  return useQuery({
    queryKey: disciplineKeys.list(key),
    queryFn: () => disciplineApi.list(filters),
    enabled,
    staleTime: 30_000,
  });
}

export function useMyDisciplineIncidents(termId = '', enabled = true) {
  return useQuery({
    queryKey: disciplineKeys.mine(termId),
    queryFn: () => disciplineApi.listMine(termId || undefined),
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
