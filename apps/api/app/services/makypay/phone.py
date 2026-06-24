import re


def normalize_uganda_phone(input_value: str) -> str | None:
    digits = re.sub(r"\D", "", input_value)

    if digits.startswith("256") and len(digits) == 12:
        return digits

    if digits.startswith("0") and len(digits) == 10:
        return f"256{digits[1:]}"

    if len(digits) == 9:
        return f"256{digits}"

    return None


def format_phone_for_display(phone: str) -> str:
    if len(phone) != 12 or not phone.startswith("256"):
        return phone
    return f"+{phone[:3]} {phone[3:5]} {phone[5:8]} {phone[8:]}"
