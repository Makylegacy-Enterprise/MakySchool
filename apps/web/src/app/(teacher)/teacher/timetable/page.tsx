'use client';

import { DashboardPage } from '@makyschool/ui/components/layout/DashboardPage';
import { TeacherTimetableCard } from '@/components/teacher/TeacherTimetableCard';

export default function TeacherTimetablePage() {
  return (
    <DashboardPage
      eyebrow="Teacher portal"
      title="My timetable"
      description="Your weekly teaching schedule"
      maxWidth="7xl"
      embedded
    >
      <div className="rounded-2xl border border-theme bg-theme-page p-5 sm:p-6">
        <TeacherTimetableCard />
      </div>
    </DashboardPage>
  );
}
