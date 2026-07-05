"use client";

import { GradingSettingsForm } from "@/components/school-admin/settings/GradingSettingsForm";
import { SettingsPanel } from "@/components/school-admin/settings/SettingsPanel";

export default function SchoolSettingsGradingPage() {
  return (
    <SettingsPanel
      eyebrow="Settings"
      title="Grading scale"
      description="Manage score bands and grade labels for your school."
    >
      {({ settings, reload }) => (
        <GradingSettingsForm settings={settings} onSaved={() => void reload()} />
      )}
    </SettingsPanel>
  );
}
