"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectProps = {
  value: string;
  placeholder: string;
  options: { value: string; label: string; disabled?: boolean }[];
  onValueChange: (value: string) => void;
};

export function Select({ value, placeholder, options, onValueChange }: SelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger className="flex h-11 w-full items-center justify-between rounded-lg border border-input bg-background px-3 text-sm font-semibold text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring">
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="h-4 w-4" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="z-50 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl">
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={cn(
                  "relative flex h-10 min-w-40 cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-3 text-sm outline-none",
                  "focus:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-40"
                )}
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex items-center">
                  <Check className="h-4 w-4" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
