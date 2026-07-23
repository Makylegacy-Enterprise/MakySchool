'use client';

import { StudentAttendancePanel } from '@/components/attendance/StudentAttendancePanel';
import { SlideOver } from '@makyschool/ui/components/ui/SlideOver';

export function TeacherStudentAttendanceDrawer({
  open,
  onClose,
  studentId,
  studentName,
}: {
  open: boolean;
  onClose: () => void;
  studentId: string | null;
  studentName: string;
}) {
  return (
    <SlideOver
      open={open && !!studentId}
      onClose={onClose}
      title={studentName || 'Student attendance'}
      description="Term attendance summary and recent absences"
    >
      {studentId ? (
        <div className="p-4 sm:p-6 overflow-y-auto">
          <StudentAttendancePanel studentId={studentId} compact />
        </div>
      ) : null}
    </SlideOver>
  );
}
