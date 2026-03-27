"use client";

import React from "react";
import { DataTable } from "@/components/charts/DataTable";
import { useQueryData } from "./QueryContext";

interface MDXDataTableProps {
  data: string;
  title?: string;
  pageSize?: number;
}

export function MDXDataTable({ data, ...rest }: MDXDataTableProps) {
  const rows = useQueryData(data);
  return <DataTable data={rows} {...rest} />;
}
