"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
};

export function SubmitButton({
  children,
  pendingLabel = "처리 중…",
  className = "button button--primary",
  disabled = false,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isPending = pending || disabled;

  return (
    <button className={className} type="submit" disabled={isPending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
