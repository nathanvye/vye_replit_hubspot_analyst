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
  q1Goal?: number;
  q2Goal?: number;
  q3Goal?: number;
  q4Goal?: number;
  yearGoalTotal?: number;
}

interface HubSpotListData {
  listId: string;
  listName: string;
  memberCount: number;
}

interface KPITableProps {
  rows: KPIRow[];
  year?: number;
  formSubmissions?: FormSubmissionData[];
  hubspotLists?: HubSpotListData[];
}

export function KPITable({ rows, year = 2025, formSubmissions = [], hubspotLists = [] }: KPITableProps) {
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

  const totalRows = rows.length + formSubmissions.length + hubspotLists.length;

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
                  <div className={cn(
                    "text-xs",
                    row.subtext.toLowerCase().includes('no ') || 
                    row.subtext.toLowerCase().includes('error') || 
                    row.subtext.toLowerCase().includes('unavailable') || 
                    row.subtext.toLowerCase().includes('create a')
                      ? "text-amber-600 font-medium" 
                      : "text-muted-foreground"
                  )}>
                    {row.subtext}
                  </div>
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
            const hasGoals = form.q1Goal || form.q2Goal || form.q3Goal || form.q4Goal;
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
                <td className="px-3 py-3 text-center bg-purple-50 dark:bg-purple-950/20" data-testid={`text-form-q1-goal-${idx}`}>
                  {form.q1Goal ? formatValue(form.q1Goal) : '-'}
                </td>
                <td className={cn(
                  "px-3 py-3 text-center bg-purple-100 dark:bg-purple-900/30 font-semibold",
                  form.q1Goal && form.Q1 > form.q1Goal ? "text-green-600" : "",
                  form.q1Goal && form.Q1 < form.q1Goal ? "text-red-600" : ""
                )} data-testid={`text-form-q1-${idx}`}>
                  {formatValue(form.Q1)}
                </td>
                <td className="px-3 py-3 text-center bg-purple-50 dark:bg-purple-950/20" data-testid={`text-form-q2-goal-${idx}`}>
                  {form.q2Goal ? formatValue(form.q2Goal) : '-'}
                </td>
                <td className={cn(
                  "px-3 py-3 text-center bg-purple-100 dark:bg-purple-900/30 font-semibold",
                  form.q2Goal && form.Q2 > form.q2Goal ? "text-green-600" : "",
                  form.q2Goal && form.Q2 < form.q2Goal ? "text-red-600" : ""
                )} data-testid={`text-form-q2-${idx}`}>
                  {formatValue(form.Q2)}
                </td>
                <td className="px-3 py-3 text-center bg-purple-50 dark:bg-purple-950/20" data-testid={`text-form-q3-goal-${idx}`}>
                  {form.q3Goal ? formatValue(form.q3Goal) : '-'}
                </td>
                <td className={cn(
                  "px-3 py-3 text-center bg-purple-100 dark:bg-purple-900/30 font-semibold",
                  form.q3Goal && form.Q3 > form.q3Goal ? "text-green-600" : "",
                  form.q3Goal && form.Q3 < form.q3Goal ? "text-red-600" : ""
                )} data-testid={`text-form-q3-${idx}`}>
                  {formatValue(form.Q3)}
                </td>
                <td className="px-3 py-3 text-center bg-purple-50 dark:bg-purple-950/20" data-testid={`text-form-q4-goal-${idx}`}>
                  {form.q4Goal ? formatValue(form.q4Goal) : '-'}
                </td>
                <td className={cn(
                  "px-3 py-3 text-center bg-purple-100 dark:bg-purple-900/30 font-semibold",
                  form.q4Goal && form.Q4 > form.q4Goal ? "text-green-600" : "",
                  form.q4Goal && form.Q4 < form.q4Goal ? "text-red-600" : ""
                )} data-testid={`text-form-q4-${idx}`}>
                  {formatValue(form.Q4)}
                </td>
                <td className="px-3 py-3 text-center bg-green-100 dark:bg-green-900/30 font-semibold" data-testid={`text-form-goal-${idx}`}>
                  {hasGoals ? formatValue(form.yearGoalTotal || 0) : formatValue(form.total)}
                </td>
              </tr>
            );
          })}
          
          {hubspotLists.map((list, idx) => {
            const rowIndex = rows.length + formSubmissions.length + idx;
            return (
              <tr 
                key={`list-${list.listId}`} 
                className={cn(
                  "border-t border-border",
                  rowIndex % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-gray-50 dark:bg-slate-800"
                )}
                data-testid={`row-hubspot-list-${idx}`}
              >
                <td className="px-3 py-3 text-left">
                  <div className="text-[#5C3D5E] font-semibold" data-testid={`text-list-name-${idx}`}>
                    {list.listName}
                  </div>
                  <div className="text-xs text-muted-foreground">List Members</div>
                </td>
                <td className="px-3 py-3 text-center font-bold">-</td>
                <td className="px-3 py-3 text-center bg-purple-50 dark:bg-purple-950/20">-</td>
                <td className="px-3 py-3 text-center bg-purple-100 dark:bg-purple-900/30">-</td>
                <td className="px-3 py-3 text-center bg-purple-50 dark:bg-purple-950/20">-</td>
                <td className="px-3 py-3 text-center bg-purple-100 dark:bg-purple-900/30">-</td>
                <td className="px-3 py-3 text-center bg-purple-50 dark:bg-purple-950/20">-</td>
                <td className="px-3 py-3 text-center bg-purple-100 dark:bg-purple-900/30">-</td>
                <td className="px-3 py-3 text-center bg-purple-50 dark:bg-purple-950/20">-</td>
                <td className="px-3 py-3 text-center bg-purple-100 dark:bg-purple-900/30">-</td>
                <td className="px-3 py-3 text-center bg-green-100 dark:bg-green-900/30 font-semibold" data-testid={`text-list-count-${idx}`}>
                  {formatValue(list.memberCount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
