"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  variant = "primary",
  className,
  size = "md",
  name,
  value,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "success";
  className?: string;
  size?: "sm" | "md" | "lg";
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button className={className} disabled={pending} name={name} size={size} type="submit" value={value} variant={variant}>
      {pending ? (
        <>
          <span className="btn-spinner" />
          Сохранение…
        </>
      ) : (
        children
      )}
    </Button>
  );
}
