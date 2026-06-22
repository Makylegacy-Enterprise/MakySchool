export type CreateStudentInput = {
  full_name?: string;
  date_of_birth?: string;
  gender?: string;
  class_id?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
  guardian_relationship?: string;
};

export function validateStudentForm(data: CreateStudentInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.full_name?.trim()) {
    errors.full_name = "Full name is required.";
  } else if (data.full_name.trim().length < 2) {
    errors.full_name = "Full name must be at least 2 characters.";
  } else if (data.full_name.trim().length > 100) {
    errors.full_name = "Full name must be under 100 characters.";
  }

  if (data.date_of_birth) {
    const dob = new Date(data.date_of_birth);
    if (Number.isNaN(dob.getTime())) {
      errors.date_of_birth = "Enter a valid date of birth.";
    } else if (dob > new Date()) {
      errors.date_of_birth = "Date of birth cannot be in the future.";
    }
  }

  if (!data.class_id) {
    errors.class_id = "Please select a class.";
  }

  if (!data.guardian_name?.trim()) {
    errors.guardian_name = "Guardian name is required.";
  } else if (data.guardian_name.trim().length < 2) {
    errors.guardian_name = "Guardian name must be at least 2 characters.";
  }

  if (data.guardian_phone && !/^\+?[0-9\s\-]{7,15}$/.test(data.guardian_phone)) {
    errors.guardian_phone = "Enter a valid phone number.";
  }

  return errors;
}

export function studentInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function formatDobWithAge(dateOfBirth: string | null): string {
  if (!dateOfBirth) return "—";
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return "—";

  const formatted = dob.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return `${formatted} (${age} yrs)`;
}

export function capitalizeGender(gender: string | null): string {
  if (!gender) return "—";
  return gender.charAt(0).toUpperCase() + gender.slice(1);
}
