import type { AnchorHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function PdfLink({ className, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a {...props} className={cn(className)} rel="noopener noreferrer" target="_blank">
      {children}
    </a>
  );
}
