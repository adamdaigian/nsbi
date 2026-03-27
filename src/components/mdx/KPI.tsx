"use client";

import React from "react";
import { BigValue } from "@/components/charts/BigValue";
import { useQueryData } from "./QueryContext";

interface KPIProps {
  data: string;
  value: string;
  title?: string;
  format?: string;
  comparison?: string;
  comparisonFormat?: string;
  comparisonLabel?: string;
  isUpGood?: boolean;
}

export function KPI({ data, ...rest }: KPIProps) {
  const rows = useQueryData(data);
  return <BigValue data={rows} {...rest} />;
}
