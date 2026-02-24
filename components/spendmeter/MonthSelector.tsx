"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type MonthOption = {
  id: string;
  label: string;
  is_active?: boolean;
};

type MonthSelectorProps = {
  months: MonthOption[];
  value: string;
  onChange: (monthId: string) => void;
};

export function MonthSelector({ months, value, onChange }: MonthSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full max-w-[180px]">
        <SelectValue placeholder="Select month" />
      </SelectTrigger>
      <SelectContent>
        {months.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
