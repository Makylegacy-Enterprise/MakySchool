import { apiClient } from './client';
import type {
  DisciplineIncident,
  DisciplineStudentDossier,
  CreateDisciplineIncidentPayload,
  RepeatOffendersResponse,
} from '@makyschool/shared';

export const disciplineApi = {
  list(params: {
    termId?: string;
    incidentType?: string;
    classId?: string;
    studentId?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}) {
    const q = new URLSearchParams();
    if (params.termId) q.set('term_id', params.termId);
    if (params.incidentType) q.set('incident_type', params.incidentType);
    if (params.classId) q.set('class_id', params.classId);
    if (params.studentId) q.set('student_id', params.studentId);
    if (params.dateFrom) q.set('date_from', params.dateFrom);
    if (params.dateTo) q.set('date_to', params.dateTo);
    const qs = q.toString();
    return apiClient<DisciplineIncident[]>(
      `/api/schools/discipline${qs ? `?${qs}` : ''}`,
    ).then((r) => r.data);
  },

  listMine(termId?: string) {
    const qs = termId ? `?term_id=${termId}` : '';
    return apiClient<DisciplineIncident[]>(
      `/api/schools/discipline/mine${qs}`,
    ).then((r) => r.data);
  },

  getStudent(studentId: string, termId?: string) {
    const qs = termId ? `?term_id=${termId}` : '';
    return apiClient<DisciplineStudentDossier>(
      `/api/schools/discipline/student/${studentId}${qs}`,
    ).then((r) => r.data);
  },

  create(payload: CreateDisciplineIncidentPayload) {
    return apiClient<DisciplineIncident>('/api/schools/discipline', {
      method: 'POST',
      body: {
        student_id: payload.studentId,
        term_id: payload.termId,
        incident_date: payload.incidentDate,
        incident_type: payload.incidentType,
        description: payload.description,
        action_taken: payload.actionTaken ?? null,
        category: payload.category ?? null,
        class_id: payload.classId ?? null,
      },
    }).then((r) => r.data);
  },

  addRemarks(incidentId: string, remarks: string) {
    return apiClient<DisciplineIncident>(
      `/api/schools/discipline/${incidentId}/remarks`,
      { method: 'PATCH', body: { remarks } },
    ).then((r) => r.data);
  },

  voidIncident(incidentId: string, reason: string) {
    return apiClient<{ id: string; status: string }>(
      `/api/schools/discipline/${incidentId}/void`,
      { method: 'POST', body: { reason } },
    ).then((r) => r.data);
  },

  getRepeatOffenders(termId?: string) {
    const qs = termId ? `?term_id=${termId}` : '';
    return apiClient<RepeatOffendersResponse>(
      `/api/schools/discipline/flags/repeat-offenders${qs}`,
    ).then((r) => r.data);
  },
};
