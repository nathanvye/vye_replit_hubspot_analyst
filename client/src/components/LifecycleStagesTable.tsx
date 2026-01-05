import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users } from "lucide-react";

interface LifecycleStageData {
  currentCounts: Record<string, number>;
  quarterlyBecame: Record<string, { Q1: number; Q2: number; Q3: number; Q4: number; total: number }>;
}

interface LifecycleStagesTableProps {
  data: LifecycleStageData;
  year: number;
}

const STAGE_ORDER = [
  "Subscriber",
  "Lead", 
  "Marketing Qualified Lead",
  "Sales Qualified Lead",
  "Opportunity",
  "Customer",
  "Evangelist",
  "Other"
];

export function LifecycleStagesTable({ data, year }: LifecycleStagesTableProps) {
  if (!data || !data.quarterlyBecame) {
    return null;
  }

  const stages = STAGE_ORDER.filter(stage => 
    data.quarterlyBecame[stage] && data.quarterlyBecame[stage].total > 0
  );

  if (stages.length === 0) {
    return null;
  }

  return (
    <Card data-testid="lifecycle-stages-table">
      <CardHeader>
        <CardTitle className="text-lg text-[#5C3D5E] flex items-center gap-2">
          <Users className="w-5 h-5" />
          Lifecycle Stage Progression ({year})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#5C3D5E]/5">
                <TableHead className="font-semibold text-[#5C3D5E]">Stage</TableHead>
                <TableHead className="text-right font-semibold text-[#5C3D5E]">Current</TableHead>
                <TableHead className="text-right font-semibold text-[#5C3D5E]">Became Q1</TableHead>
                <TableHead className="text-right font-semibold text-[#5C3D5E]">Became Q2</TableHead>
                <TableHead className="text-right font-semibold text-[#5C3D5E]">Became Q3</TableHead>
                <TableHead className="text-right font-semibold text-[#5C3D5E]">Became Q4</TableHead>
                <TableHead className="text-right font-semibold text-[#5C3D5E]">YTD Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages.map((stage) => {
                const quarterly = data.quarterlyBecame[stage];
                const current = data.currentCounts[stage] || 0;
                
                return (
                  <TableRow key={stage} data-testid={`lifecycle-row-${stage.toLowerCase().replace(/\s+/g, '-')}`}>
                    <TableCell className="font-medium">{stage}</TableCell>
                    <TableCell className="text-right font-mono">
                      {current.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {quarterly.Q1 > 0 ? quarterly.Q1.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {quarterly.Q2 > 0 ? quarterly.Q2.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {quarterly.Q3 > 0 ? quarterly.Q3.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {quarterly.Q4 > 0 ? quarterly.Q4.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-[#5C3D5E]">
                      {quarterly.total.toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          "Became" columns show how many contacts transitioned into each lifecycle stage during each quarter.
        </p>
      </CardContent>
    </Card>
  );
}
