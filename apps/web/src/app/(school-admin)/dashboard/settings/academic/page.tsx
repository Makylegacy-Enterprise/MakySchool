"use client";

import { AcademicSettingsForm } from "@/components/school-admin/settings/AcademicSettingsForm";
import { SettingsPanel } from "@/components/school-admin/settings/SettingsPanel";

export default function SchoolSettingsAcademicPage() {
  return (
    <SettingsPanel
      eyebrow="Settings"
      title="Academic year"
      description="Set the current academic year and term dates."
    >
      {({ settings, reload }) => (
        <AcademicSettingsForm settings={settings} onSaved={() => void reload()} />
      )}
    </SettingsPanel>
  );
}
