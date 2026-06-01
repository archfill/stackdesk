import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

/**
 * Operator-console buttons. Sharp corners, hairline borders, no large
 * shadows. Variants encode intent rather than colour: "accent" is the
 * single brand action, "neutral" is the workhorse, "ghost" is for low
 * priority controls, "danger" reserved for destructive flows.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap select-none",
    "font-medium text-[13px] leading-none tracking-tight",
    "transition-[background-color,border-color,color,box-shadow] duration-150",
    "focus-visible:outline focus-visible:outline-1 focus-visible:outline-[color:var(--color-acid)] focus-visible:outline-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        accent: [
          "bg-[color:var(--color-acid)] text-[color:var(--color-ink-0)]",
          "hover:bg-[color:var(--color-acid-strong)]",
          "border border-[color:var(--color-acid)]",
        ],
        neutral: [
          "bg-[color:var(--color-ink-2)] text-[color:var(--color-text-0)]",
          "border border-[color:var(--color-rule)]",
          "hover:bg-[color:var(--color-ink-3)] hover:border-[color:var(--color-rule-bright)]",
        ],
        ghost: [
          "bg-transparent text-[color:var(--color-text-1)]",
          "border border-transparent",
          "hover:bg-[color:var(--color-ink-2)] hover:text-[color:var(--color-text-0)]",
        ],
        outline: [
          "bg-transparent text-[color:var(--color-text-1)]",
          "border border-[color:var(--color-rule)]",
          "hover:bg-[color:var(--color-ink-2)] hover:border-[color:var(--color-rule-bright)] hover:text-[color:var(--color-text-0)]",
        ],
        danger: [
          "bg-transparent text-[color:var(--color-err)]",
          "border border-[color:color-mix(in_srgb,var(--color-err)_38%,transparent)]",
          "hover:bg-[color:var(--color-err-soft)] hover:border-[color:color-mix(in_srgb,var(--color-err)_60%,transparent)]",
        ],
        link: [
          "bg-transparent text-[color:var(--color-acid)] underline-offset-4",
          "hover:underline",
          "px-0",
        ],
      },
      size: {
        sm: "h-7 px-2.5 text-[12px] [&_svg]:size-3.5 rounded-[3px]",
        md: "h-8 px-3 text-[12.5px] [&_svg]:size-4 rounded-[3px]",
        lg: "h-10 px-4 text-[13.5px] [&_svg]:size-[18px] rounded-[4px]",
        icon: "h-8 w-8 [&_svg]:size-4 rounded-[3px]",
        "icon-sm": "h-7 w-7 [&_svg]:size-[14px] rounded-[3px]",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
