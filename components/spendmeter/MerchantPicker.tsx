"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { listMerchantSuggestions } from "@/lib/actions/transactions";

const DEBOUNCE_MS = 280;

type MerchantPickerProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

export function MerchantPicker({
  value,
  onValueChange,
  placeholder = "Merchant name",
  disabled,
  className,
  "aria-label": ariaLabel,
}: MerchantPickerProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    setLoading(true);
    const res = await listMerchantSuggestions({ q: q.trim(), limit: 20 });
    setLoading(false);
    if (res.ok) {
      setSuggestions(res.data.suggestions);
    } else {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setInputValue("");
      setSearchTerm("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    fetchSuggestions(searchTerm);
  }, [open, searchTerm, fetchSuggestions]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearchChange = useCallback((q: string) => {
    setInputValue(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchTerm(q), DEBOUNCE_MS);
  }, []);

  const trimmedQuery = inputValue.trim();
  const exactMatch =
    trimmedQuery &&
    suggestions.some(
      (s) => s.localeCompare(trimmedQuery, undefined, { sensitivity: "accent" }) === 0
    );
  const showCreate = trimmedQuery && !exactMatch;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command
          shouldFilter={false}
          onValueChange={handleSearchChange}
        >
          <CommandInput
            placeholder="Search merchants..."
            value={inputValue}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            {loading ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            ) : (
              <>
                <CommandEmpty>
                  No merchants found. Type to create one.
                </CommandEmpty>
                <CommandGroup>
                  {showCreate && (
                    <CommandItem
                      value={`__create:${trimmedQuery}`}
                      onSelect={() => {
                        onValueChange(trimmedQuery);
                        setOpen(false);
                        setInputValue("");
                        setSearchTerm("");
                      }}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Create &quot;{trimmedQuery}&quot;
                    </CommandItem>
                  )}
                  {suggestions.map((name) => (
                    <CommandItem
                      key={name}
                      value={name}
                      onSelect={() => {
                        onValueChange(name);
                        setOpen(false);
                        setInputValue("");
                        setSearchTerm("");
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === name ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
