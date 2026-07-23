export type DisciplineIncidentType = 'minor' | 'major' | 'commendation';

export type DisciplineIncidentStatus = 'active' | 'voided';

export interface DisciplineIncident {
  id: string;
  studentId: string;
  studentName: string;
  learnerId: string;
  termId: string;
  classId: string | null;
  className: string | null;
  incidentDate: string;
  incidentType: DisciplineIncidentType;
  category: string | null;
  description: string;
  actionTaken: string | null;
  recordedBy: string;
  recordedByName: string | null;
  headTeacherRemarks: string | null;
  remarkedBy: string | null;
  remarkedByName: string | null;
  remarkedAt: string | null;
  status: DisciplineIncidentStatus;
  createdAt: string | null;
}

export interface DisciplineStudentSummary {
  major: number;
  minor: number;
  commendation: number;
  total: number;
  flagged: boolean;
  threshold: number;
}

export interface DisciplineStudentDossier {
  studentId: string;
  summary: DisciplineStudentSummary;
  incidents: DisciplineIncident[];
}

export interface CreateDisciplineIncidentPayload {
  studentId: string;
  termId: string;
  incidentDate: string;
  incidentType: DisciplineIncidentType;
  description: string;
  actionTaken?: string;
  category?: string;
  classId?: string;
}

export interface RepeatOffender {
  studentId: string;
  studentName: string;
  learnerId: string;
  className: string | null;
  majorCount: number;
}

export interface RepeatOffendersResponse {
  termId: string | null;
  threshold: number;
  students: RepeatOffender[];
}
