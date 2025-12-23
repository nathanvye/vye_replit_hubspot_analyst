import { cn } from "@/lib/utils";

interface QuarterData {
  projection: number | string;
  actual: number | string | null;
}

interface KPIRow {
  metric: string;
  subtext?: string;
  yoyChange?: string;
  yearEndProjection: number | string;
  q1: QuarterData;
  q2: QuarterData;
  q3: QuarterData;
  q4: QuarterData;
  goal: number | string;
}

interface FormSubmissionData {
  formName: string;
  formGuid: string;
  Q1: number;
  Q2: number;
  Q3: number;
  Q4: number;
  total: number;
}

interface KPITableProps {
  rows: KPIRow[];
  year?: number;
  formSubmissions?: FormSubmissionData[];
}

export function KPITable({ rows, year = 2025, formSubmissions = [] }: KPITableProps) {
  const formatValue = (value: number | string | null) => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return value;
  };

  const getCellStyle = (actual: number | string | null, projection: number | string) => {
    if (actual === null || actual === undefined || actual === '' || actual === '-') {
      return '';
    }
    const actualNum = typeof actual === 'number' ? actual : parseFloat(String(actual));
    const projNum = typeof projection === 'number' ? projection : parseFloat(String(projection));
    
    if (isNaN(actualNum) || isNaN(projNum)) return '';
    
    if (actualNum >= projNum) {
      return 'text-green-600 font-semibold';
    } else if (actualNum < projNum * 0.9) {
      return 'text-red-600 font-semibold';
    }
    return '';
  };

  const totalRows = rows.length + formSubmissions.length;

  return (
    <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#5C3D5E] text-white">
            <th className="px-3 py-3 text-left font-semibold min-w-[140px]"></th>
            <th className="px-3 py-3 text-center font-semibold min-w-[90px]">
              <div className="text-xs">{year - 1}</div>
              <div>Year-End</div>
              <div>Projections</div>
            </th>
            <th className="px-3 py-3 text-center font-semibold bg-[#4A3049] min-w-[70px]">Q1</th>
            <th className="px-3 py-3 text-center font-semibold bg-[#8B7089] min-w-[80px]">Q1 Actuals</th>
            <th className="px-3 py-3 text-center font-semibold bg-[#4A3049] min-w-[70px]">Q2</th>
            <th className="px-3 py-3 text-center font-semibold bg-[#8B7089] min-w-[80px]">Q2 Actuals</th>
            <th className="px-3 py-3 text-center font-semibold bg-[#4A3049] min-w-[70px]">Q3</th>
            <th className="px-3 py-3 text-center font-semibold bg-[#8B7089] min-w-[80px]">Q3 Actuals</th>
            <th className="px-3 py-3 text-center font-semibold bg-[#4A3049] min-w-[70px]">Q4</th>
            <th className="px-3 py-3 text-center font-semibold bg-[#8B7089] min-w-[80px]">Q4 Actuals</th>
            <th className="px-3 py-3 text-center font-semibold bg-[#2D5A3D] min-w-[80px]">Goal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr 
              key={idx} 
              className={cn(
                "border-t border-border",
                idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-gray-50 dark:bg-slate-800"
              )}
            >
              <td className="px-3 py-3 text-left">
                <div className="text-[#5C3D5E] font-semibold underline cursor-pointer hover:text-[#7A5478]">
                  {row.metric}
                </div>
                {row.subtext && (
                  <div className="text-xs text-muted-foreground">{row.subtext}</div>
                )}
                {row.yoyChange && (
                  <div className={cn(
                    "text-xs font-medium",
                    row.yoyChange.startsWith('+') ? "text-green-600" : "text-muted-foreground"
                  )}>
                    {row.yoyChange}
                  </div>
                )}
              </td>
              <td className="px-3 py-3 text-center font-bold">{formatValue(row.yearEndProjection)}</td>
              <td className="px-3 py-3 text-center bg-purple-50 dark:bg-purple-950/20">{formatValue(row.q1.projection)}</td>
              <td className={cn(
                "px-3 py-3 text-center bg-purple-100 dark:bg-purple-900/30",
                getCellStyle(row.q1.actual, row.q1.projection)
              )}>
                {formatValue(row.q1.actual)}
              </td>
              <td className="px-3 py-3 text-center bg-purple-50 dark:bg-purple-950/20">{formatValue(row.q2.projection)}</td>
              <td className={cn(
                "px-3 py-3 text-center bg-purple-100 dark:bg-purple-900/30",
                getCellStyle(row.q2.actual, row.q2.projection)
              )}>
                {formatValue(row.q2.actual)}
              </td>
              <td className="px-3 py-3 text-center bg-purple-50 dark:bg-purple-950/20">{formatValue(row.q3.projection)}</td>
              <td className={cn(
                "px-3 py-3 text-center bg-purple-100 dark:bg-purple-900/30",
                getCellStyle(row.q3.actual, row.q3.projection)
              )}>
                {formatValue(row.q3.actual)}
              </td>
              <td className="px-3 py-3 text-center bg-purple-50 dark:bg-purple-950/20">{formatValue(row.q4.projection)}</td>
              <td className={cn(
                "px-3 py-3 text-center bg-purple-100 dark:bg-purple-900/30",
                getCellStyle(row.q4.actual, row.q4.projection)
              )}>
                {formatValue(row.q4.actual)}
              </td>
              <td className="px-3 py-3 text-center bg-green-100 dark:bg-green-900/30 font-semibold">
                {formatValue(row.goal)}
              </td>
            </tr>
          ))}
          
          {formSubmissions.map((form, idx) => {
            const rowIndex = rows.length + idx;
            return (
              <tr 
                key={`form-${form.formGuid}`} 
                className={cn(
                  "border-t border-border",
                  rowIndex % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-gray-50 dark:bg-slate-800"
                )}
                data-testid={`row-form-submission-${idx}`}
              >
                <td className="px-3 py-3 text-left">
                  <div className="text-[#5C3D5E] font-semibold" data-testid={`text-form-name-${idx}`}>
                    {form.formName}
                  </div>
                  <div className="text-xs text-muted-foreground">Form Submissions</div>
                </td>
                <td className="px-3 py-3 text-center font-bold">-</td>
                <td className="px-3 py-3 text-center bg-purple-50 dark:bg-purple-950/20">-</td>
                <td className="px-3 py-3 text-center bg-purple-100 dark:bg-purple-900/30 font-semibold" data-testid={`text-form-q1-${idx}`}>
                  {formatValue(form.Q1)}
                </td>
                <td className="px-3 py-3 text-center bg-purple-50 dark:bg-purple-950/20">-</td>
                <td className="px-3 py-3 text-center bg-purple-100 dark:bg-purple-900/30 font-semibold" data-testid={`text-form-q2-${idx}`}>
                  {formatValue(form.Q2)}
                </td>
                <td className="px-3 py-3 text-center bg-purple-50 dark:bg-purple-950/20">-</td>
                <td className="px-3 py-3 text-center bg-purple-100 dark:bg-purple-900/30 font-semibold" data-testid={`text-form-q3-${idx}`}>
                  {formatValue(form.Q3)}
                </td>
                <td className="px-3 py-3 text-center bg-purple-50 dark:bg-purple-950/20">-</td>
                <td className="px-3 py-3 text-center bg-purple-100 dark:bg-purple-900/30 font-semibold" data-testid={`text-form-q4-${idx}`}>
                  {formatValue(form.Q4)}
                </td>
                <td className="px-3 py-3 text-center bg-green-100 dark:bg-green-900/30 font-semibold" data-testid={`text-form-total-${idx}`}>
                  {formatValue(form.total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
