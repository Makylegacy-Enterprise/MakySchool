'use client';

import { useState } from 'react';
import { Modal } from '@makyschool/ui/components/ui/Modal';
import { StatusBanner } from '@makyschool/ui/components/ui/StatusBanner';
import { useToast } from '@/providers/ToastProvider';
import { useCreateDisciplineIncident } from '@/hooks/useDiscipline';
import { useCurrentTerm } from '@/hooks/useCurrentTerm';
import { todayEAT } from '@/lib/api/attendance';
import type { DisciplineIncidentType } from '@makyschool/shared';

export function LogDisciplineIncidentPanel({
  open,
  onClose,
  studentId,
  studentName,
  classId,
}: {
  open: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  classId?: string | null;
}) {
  const { toast } = useToast();
  const { data: term } = useCurrentTerm();
  const create = useCreateDisciplineIncident();

  const [incidentDate, setIncidentDate] = useState(todayEAT());
  const [incidentType, setIncidentType] = useState<DisciplineIncidentType>('minor');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setIncidentDate(todayEAT());
    setIncidentType('minor');
    setCategory('');
    setDescription('');
    setActionTaken('');
    setError(null);
  }

  async function handleSubmit() {
    if (!term?.id) {
      setError('No current term configured.');
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({
        studentId,
        termId: term.id,
        incidentDate,
        incidentType,
        description: description.trim(),
        actionTaken: actionTaken.trim() || undefined,
        category: category.trim() || undefined,
        classId: classId || undefined,
      });
      toast.success('Discipline incident logged.');
      reset();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to log incident.';
      setError(msg);
      toast.error(msg);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      size="lg"
      title="Log discipline incident"
      description={`Record for ${studentName}`}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="ms-btn-secondary" onClick={onClose} disabled={create.isPending}>
            Cancel
          </button>
          <button
            type="button"
            className="ms-btn-primary"
            disabled={create.isPending || !description.trim()}
            onClick={() => void handleSubmit()}
          >
            {create.isPending ? 'Saving…' : 'Save incident'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {error ? <StatusBanner tone="error" message={error} /> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-theme-muted">Date</span>
            <input
              type="date"
              max={todayEAT()}
              className="ms-input w-full"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-theme-muted">Type</span>
            <select
              className="ms-input w-full"
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value as DisciplineIncidentType)}
            >
              <option value="minor">Minor</option>
              <option value="major">Major</option>
              <option value="commendation">Commendation</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-theme-muted">Category (optional)</span>
          <input
            className="ms-input w-full"
            placeholder="e.g. Lateness, Bullying, Leadership"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-theme-muted">Description</span>
          <textarea
            className="ms-input w-full"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What happened?"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-theme-muted">Action taken (optional)</span>
          <textarea
            className="ms-input w-full"
            rows={2}
            value={actionTaken}
            onChange={(e) => setActionTaken(e.target.value)}
            placeholder="Warning, detention, counselling…"
          />
        </label>
      </div>
    </Modal>
  );
}
