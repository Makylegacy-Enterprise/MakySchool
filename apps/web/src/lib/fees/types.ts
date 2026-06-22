import type { MakySchoolRole } from "@makyschool/shared/types";

export type FeeAccountStatus = "unpaid" | "partial" | "paid" | "waived" | "overpaid";

export type PaymentMethod = "cash" | "bank_transfer" | "mobile_money" | "cheque" | "other";

export type FeeStructure = {
  id: string;
  class_id: string;
  class_name: string;
  term_name: string;
  academic_year: number;
  amount: number;
  description?: string | null;
  is_active: boolean;
  student_count: number;
  total_owed: number;
  total_collected: number;
  total_outstanding: number;
};

export type FeePayment = {
  id: string;
  receipt_number: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  voided: boolean;
  student_name: string;
  learner_id?: string;
  class_name?: string;
  term_name?: string;
  recorded_by_name?: string | null;
};

export type StudentFeeAccount = {
  id: string;
  fee_structure_id: string;
  term_name: string;
  academic_year: number;
  class_name: string;
  amount_owed: number;
  amount_paid: number;
  balance: number;
  status: FeeAccountStatus;
  payments: Array<{
    id: string;
    receipt_number: string;
    amount: number;
    payment_date: string;
    payment_method: PaymentMethod;
    voided: boolean;
  }>;
};

export type OutstandingStudent = {
  student_id: string;
  full_name: string;
  learner_id: string;
  class_name: string;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  account_id: string;
  amount_owed: number;
  amount_paid: number;
  balance: number;
  status: FeeAccountStatus;
  term_name: string;
  academic_year: number;
};

export type FeesDashboardStats = {
  total_collected: number;
  total_outstanding: number;
  students_fully_paid: number;
  students_with_balance: number;
};

export function feesBasePath(role: MakySchoolRole) {
  return role === "bursar" ? "/bursar" : "/dashboard/fees";
}

export function paymentMethodLabel(method: PaymentMethod | string) {
  switch (method) {
    case "bank_transfer":
      return "Bank Transfer";
    case "mobile_money":
      return "Mobile Money";
    case "cheque":
      return "Cheque";
    case "other":
      return "Other";
    default:
      return "Cash";
  }
}

export function feeStatusBadgeClass(status: FeeAccountStatus | string) {
  switch (status) {
    case "paid":
      return "badge-paid";
    case "partial":
      return "badge-partial";
    case "waived":
      return "badge-waived";
    case "unpaid":
      return "badge-unpaid";
    default:
      return "badge-info";
  }
}
