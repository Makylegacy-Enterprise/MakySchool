"use client";

import { Modal } from "@makyschool/ui/components/ui/Modal";
import { StudentAttendancePanel } from "@/components/attendance/StudentAttendancePanel";

export function TeacherStudentAttendanceModal({
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
    <Modal
      open={open && !!studentId}
      onClose={onClose}
      size="xl"
      title={studentName || "Student attendance"}
      description="Term attendance summary and recent absences"
    >
      {studentId ? (
        <div className="max-h-[min(70vh,36rem)] overflow-y-auto pr-1">
          <StudentAttendancePanel studentId={studentId} compact />
        </div>
      ) : null}
    </Modal>
  );
}
