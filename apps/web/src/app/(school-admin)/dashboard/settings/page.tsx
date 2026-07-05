"use client";

import { ProfileSettingsForm } from "@/components/school-admin/settings/ProfileSettingsForm";
import { SettingsPanel } from "@/components/school-admin/settings/SettingsPanel";

export default function SchoolSettingsProfilePage() {
  return (
    <SettingsPanel
      eyebrow="Settings"
      title="School profile"
      description="Update your school name, contact details, logo, and stamp."
    >
      {({ settings, reload }) => (
        <ProfileSettingsForm settings={settings} onSaved={() => void reload()} />
      )}
    </SettingsPanel>
  );
}
