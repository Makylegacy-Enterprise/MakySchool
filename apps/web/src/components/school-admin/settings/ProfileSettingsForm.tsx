"use client";

import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import type { SchoolRecord, SchoolSettingsResponse } from "@makyschool/shared/types";
import { ProfileStep } from "@/components/school-admin/setup/steps/ProfileStep";
import {
  SettingsFormFooter,
  SettingsSection,
} from "@/components/school-admin/settings/SettingsFormLayout";
import { apiClient } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";

function MediaPreviewCard({ label, src, alt }: { label: string; src: string; alt: string }) {
  return (
    <div className="flex flex-col rounded-xl border border-theme bg-theme-raised/60 p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-theme-muted">{label}</p>
      <div className="flex min-h-[7rem] flex-1 items-center justify-center rounded-lg border border-dashed border-theme bg-theme-page p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="max-h-24 w-auto max-w-full object-contain" />
      </div>
    </div>
  );
}

export function ProfileSettingsForm({
  settings,
  onSaved,
}: {
  settings: SchoolSettingsResponse;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const profile = settings.profile;
  const [value, setValue] = useState({
    name: profile.name ?? "",
    logo: null as File | null,
    stamp: null as File | null,
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    address: profile.address ?? "",
    schoolType: (profile.school_type ?? "primary") as string,
  });
  const [mediaUrls, setMediaUrls] = useState({
    logo: profile.logo_url ?? null,
    stamp: profile.stamp_url ?? null,
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(profile.logo_url ?? null);
  const [stampPreview, setStampPreview] = useState<string | null>(profile.stamp_url ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMediaUrls({
      logo: profile.logo_url ?? null,
      stamp: profile.stamp_url ?? null,
    });
  }, [profile.logo_url, profile.stamp_url]);

  useEffect(() => {
    if (!value.logo) {
      setLogoPreview(mediaUrls.logo);
      return;
    }
    const objectUrl = URL.createObjectURL(value.logo);
    setLogoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [value.logo, mediaUrls.logo]);

  useEffect(() => {
    if (!value.stamp) {
      setStampPreview(mediaUrls.stamp);
      return;
    }
    const objectUrl = URL.createObjectURL(value.stamp);
    setStampPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [value.stamp, mediaUrls.stamp]);

  async function handleSave() {
    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.append("name", value.name.trim());
    formData.append("email", value.email.trim());
    formData.append("phone", value.phone.trim());
    formData.append("address", value.address.trim());
    formData.append("school_type", value.schoolType);
    if (value.logo) formData.append("logo", value.logo);
    if (value.stamp) formData.append("stamp", value.stamp);

    try {
      const response = await apiClient<SchoolRecord>("/schools/settings/profile", {
        method: "PATCH",
        body: formData,
      });
      setMediaUrls({
        logo: response.data.logo_url ?? mediaUrls.logo,
        stamp: response.data.stamp_url ?? mediaUrls.stamp,
      });
      setValue((current) => ({ ...current, logo: null, stamp: null }));
      toast.success("School profile saved.");
      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save profile.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={ImageIcon}
        title="Branding & contact"
        description="Logo, stamp, and school contact information."
      >
        {(logoPreview || stampPreview) && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            {logoPreview ? <MediaPreviewCard label="Logo preview" src={logoPreview} alt="School logo" /> : null}
            {stampPreview ? <MediaPreviewCard label="Stamp preview" src={stampPreview} alt="School stamp" /> : null}
          </div>
        )}
        <ProfileStep value={value} onChange={(next) => setValue(next)} />
      </SettingsSection>

      {error ? (
        <div className="rounded-xl bg-theme-danger-bg px-4 py-3 text-sm text-theme-danger">{error}</div>
      ) : null}

      <SettingsFormFooter saving={saving} saveLabel="Save profile" onSave={() => void handleSave()} />
    </div>
  );
}
