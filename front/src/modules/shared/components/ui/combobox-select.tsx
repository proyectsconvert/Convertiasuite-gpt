import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComboboxSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function ComboboxSelect({
  value,
  onChange,
  options = [],
  placeholder = "Selecciona o escribe...",
  className,
  disabled = false,
}: ComboboxSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar query interno con el value externo
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        // Si el usuario escribió algo y cerró, conservar lo que escribió
        if (query.trim() !== (value || "")) {
          onChange(query.trim());
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [query, value, onChange]);

  // Filtrar opciones basadas en el texto escrito
  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(query.toLowerCase().trim())
  );

  // Comprobar si el texto escrito coincide exactamente con alguna opción
  const hasExactMatch = options.some(
    (opt) => opt.toLowerCase() === query.toLowerCase().trim()
  );

  const showCreateOption = query.trim().length > 0 && !hasExactMatch;

  const handleSelect = (selectedVal: string) => {
    onChange(selectedVal);
    setQuery(selectedVal);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const totalItems = filteredOptions.length + (showCreateOption ? 1 : 0);
        setHighlightedIndex((prev) => (prev + 1) % Math.max(1, totalItems));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const totalItems = filteredOptions.length + (showCreateOption ? 1 : 0);
        setHighlightedIndex((prev) => (prev - 1 + totalItems) % Math.max(1, totalItems));
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen) {
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex]);
        } else if (showCreateOption && (highlightedIndex === filteredOptions.length || highlightedIndex === -1)) {
          handleSelect(query.trim());
        } else if (filteredOptions.length > 0) {
          handleSelect(filteredOptions[0]);
        } else if (query.trim()) {
          handleSelect(query.trim());
        }
      } else {
        setIsOpen(true);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-3.5 pr-14 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/60"
        />
        <div className="absolute right-2 flex items-center gap-0.5">
          {query && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              title="Limpiar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!isOpen) {
                inputRef.current?.focus();
              }
              setIsOpen(!isOpen);
            }}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            title={isOpen ? "Cerrar opciones" : "Ver opciones"}
          >
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
            {/* Opción para crear/usar texto personalizado si no está en la lista */}
            {showCreateOption && (
              <button
                type="button"
                onClick={() => handleSelect(query.trim())}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-colors font-medium border border-dashed border-primary/40 bg-primary/5 text-primary hover:bg-primary/10",
                  highlightedIndex === filteredOptions.length && "bg-primary/15"
                )}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Usar nuevo cargo: <strong className="text-foreground">"{query.trim()}"</strong>
                  </span>
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-primary shrink-0 ml-2">
                  Crear
                </span>
              </button>
            )}

            {/* Opciones existentes */}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected =
                  opt.toLowerCase() === (value || "").toLowerCase().trim();
                const isHighlighted = highlightedIndex === idx;

                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-colors text-foreground hover:bg-secondary/80",
                      isHighlighted && "bg-secondary",
                      isSelected && "font-semibold bg-primary/10 text-primary"
                    )}
                  >
                    <span className="truncate">{opt}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            ) : !showCreateOption ? (
              <div className="px-3 py-3 text-center text-xs text-muted-foreground">
                No hay opciones que coincidan. Escribe para crear una nueva.
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
