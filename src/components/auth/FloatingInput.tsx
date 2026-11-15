"use client";

import { Input } from "@/components/ui/Input";

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/**
 * Kept for old imports. It used to float the label inside the box; it now
 * renders the shared Input with the label on top like every other form.
 */
export default function FloatingInput({ label, error, placeholder, ...props }: FloatingInputProps) {
  return <Input label={label} error={error} placeholder={placeholder?.trim() ? placeholder : undefined} {...props} />;
}
