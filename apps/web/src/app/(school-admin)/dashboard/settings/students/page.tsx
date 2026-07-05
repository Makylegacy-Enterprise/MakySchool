"use client";

import { StudentIdSettingsForm } from "@/components/school-admin/settings/StudentIdSettingsForm";
import { SettingsPanel } from "@/components/school-admin/settings/SettingsPanel";

export default function SchoolSettingsStudentsPage() {
  return (
    <SettingsPanel
      eyebrow="Settings"
      title="Student numbers"
      description="Control how learner IDs are generated for new students and imports."
    >
      {({ settings, reload }) => (
        <StudentIdSettingsForm settings={settings} onSaved={() => void reload()} />
      )}
    </SettingsPanel>
  );
}
