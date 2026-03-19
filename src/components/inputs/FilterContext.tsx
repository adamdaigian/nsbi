import React, { createContext, useContext } from "react";

interface FilterContextValue {
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

const FilterContext = createContext<FilterContextValue>({
  values: {},
  onChange: () => {},
});

export function FilterProvider({
  values,
  onChange,
  children,
}: {
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  children: React.ReactNode;
}) {
  return (
    <FilterContext.Provider value={{ values, onChange }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilterValue(name: string) {
  const ctx = useContext(FilterContext);
  return {
    value: ctx.values[name],
    onChange: (value: unknown) => ctx.onChange(name, value),
  };
}

export { FilterContext };
