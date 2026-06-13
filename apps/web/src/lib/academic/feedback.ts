import { ACADEMIC_ERROR_CODES } from "@makyschool/shared/constants";

export type FeedbackState = {
  tone: "success" | "error" | "info";
  message: string;
} | null;

export function parseAcademicError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Something went wrong. Please try again.";
  }

  if (error.message) {
    return error.message;
  }

  const code = (error as Error & { code?: string }).code;

  switch (code) {
    case ACADEMIC_ERROR_CODES.CLASS_HAS_STUDENTS:
      return "This class still has enrolled students. Move them before deleting.";
    case ACADEMIC_ERROR_CODES.DUPLICATE_CLASS:
      return "A class with this level and stream already exists.";
    case ACADEMIC_ERROR_CODES.INVALID_LEVEL:
      return "This class level is not allowed for your school type.";
    case ACADEMIC_ERROR_CODES.DUPLICATE_SUBJECT:
      return "A subject with this name already exists.";
    case ACADEMIC_ERROR_CODES.SUBJECT_HAS_LINKS:
      return "Unlink this subject from classes before deleting it.";
    case ACADEMIC_ERROR_CODES.INVALID_CLASS:
      return "One or more selected classes are not valid for your school type.";
    default:
      return "Something went wrong. Please try again.";
  }
}
