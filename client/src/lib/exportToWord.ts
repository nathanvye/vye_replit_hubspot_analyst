import {
  Document,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  Packer,
  ShadingType,
} from "docx";
import { saveAs } from "file-saver";

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
  q1Goal?: number;
  q2Goal?: number;
  q3Goal?: number;
  q4Goal?: number;
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

interface ReportData {
  title: string;
  subtitle: string;
  kpiTable?: {
    year: number;
    rows: KPIRow[];
  };
  formSubmissions?: FormSubmissionData[];
  hubspotLists?: HubSpotListData[];
  dealsByStage?: { stage: string; count: number; value: number }[];
  dealsByOwner?: { owner: string; count: number; value: number }[];
  gaChannels?: any[];
  gaPageViews?: any;
  lifecycleStages?: {
    currentCounts: Record<string, number>;
    quarterlyBecame: Record<string, { Q1: number; Q2: number; Q3: number; Q4: number; total: number }>;
  };
  googleBusinessProfile?: {
    businessName: string;
    address: string;
    phone: string;
    website: string;
    categories: string[];
    hours: { day: string; hours: string }[];
    averageRating: number;
    totalReviewCount: number;
    mapsUri: string;
  };
  revenueInsights?: string[];
  leadGenInsights?: string[];
  recommendations?: string[];
  verifiedData?: {
    totalDeals: number;
    totalContacts: number;
    totalCompanies: number;
    totalDealValue: number;
    closedWonDeals: number;
    closedWonValue: number;
    openDeals: number;
    openDealsValue: number;
    pageViews?: number;
  };
}

const PURPLE_COLOR = "5C3D5E";
const DARK_PURPLE = "4A3049";
const LIGHT_PURPLE = "8B7089";
const GREEN_COLOR = "2D5A3D";
const RED_COLOR = "991B1B";

const formatValue = (value: number | string | null): string => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") {
    return value.toLocaleString();
  }
  return String(value);
};

const formatCurrency = (value: number | string): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const createHeaderCell = (text: string, bgColor: string = PURPLE_COLOR): TableCell => {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: true,
            color: "FFFFFF",
            size: 18,
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    ],
    shading: {
      type: ShadingType.SOLID,
      color: bgColor,
    },
    verticalAlign: "center",
  });
};

const createDataCell = (
  text: string,
  options: {
    bold?: boolean;
    color?: string;
    bgColor?: string;
    alignment?: typeof AlignmentType[keyof typeof AlignmentType];
  } = {}
): TableCell => {
  const { bold = false, color = "000000", bgColor, alignment = AlignmentType.CENTER } = options;
  
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold,
            color,
            size: 18,
          }),
        ],
        alignment,
      }),
    ],
    shading: bgColor
      ? {
          type: ShadingType.SOLID,
          color: bgColor,
        }
      : undefined,
    verticalAlign: "center",
  });
};

const createKPITable = (rows: KPIRow[], year: number, formSubmissions: FormSubmissionData[] = [], hubspotLists: HubSpotListData[] = []): Table => {
  const headerRow = new TableRow({
    children: [
      createHeaderCell(""),
      createHeaderCell(`${year - 1} Year-End Projections`),
      createHeaderCell("Q1", DARK_PURPLE),
      createHeaderCell("Q1 Actuals", LIGHT_PURPLE),
      createHeaderCell("Q2", DARK_PURPLE),
      createHeaderCell("Q2 Actuals", LIGHT_PURPLE),
      createHeaderCell("Q3", DARK_PURPLE),
      createHeaderCell("Q3 Actuals", LIGHT_PURPLE),
      createHeaderCell("Q4", DARK_PURPLE),
      createHeaderCell("Q4 Actuals", LIGHT_PURPLE),
      createHeaderCell("Goal", GREEN_COLOR),
    ],
  });

  const dataRows = rows.map((row, idx) => {
    const bgColor = idx % 2 === 0 ? "FFFFFF" : "F5F5F5";
    
    return new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: row.metric,
                  bold: true,
                  color: PURPLE_COLOR,
                  size: 18,
                }),
              ],
            }),
            ...(row.subtext
              ? [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: row.subtext,
                        size: 16,
                        color: "666666",
                      }),
                    ],
                  }),
                ]
              : []),
            ...(row.yoyChange
              ? [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: row.yoyChange,
                        size: 16,
                        color: row.yoyChange.startsWith("+") ? "16A34A" : "666666",
                        bold: true,
                      }),
                    ],
                  }),
                ]
              : []),
          ],
          shading: { type: ShadingType.SOLID, color: bgColor },
        }),
        createDataCell(formatValue(row.yearEndProjection), { bold: true, bgColor }),
        createDataCell(row.q1Goal ? formatValue(row.q1Goal) : formatValue(row.q1.projection), { bgColor: "F3E8FF" }),
        createDataCell(formatValue(row.q1.actual), { 
          bold: true, 
          bgColor: "E9D5FF",
          color: row.q1Goal ? (Number(row.q1.actual) > row.q1Goal ? "16A34A" : Number(row.q1.actual) < row.q1Goal ? "991B1B" : "000000") : "000000"
        }),
        createDataCell(row.q2Goal ? formatValue(row.q2Goal) : formatValue(row.q2.projection), { bgColor: "F3E8FF" }),
        createDataCell(formatValue(row.q2.actual), { 
          bold: true, 
          bgColor: "E9D5FF",
          color: row.q2Goal ? (Number(row.q2.actual) > row.q2Goal ? "16A34A" : Number(row.q2.actual) < row.q2Goal ? "991B1B" : "000000") : "000000"
        }),
        createDataCell(row.q3Goal ? formatValue(row.q3Goal) : formatValue(row.q3.projection), { bgColor: "F3E8FF" }),
        createDataCell(formatValue(row.q3.actual), { 
          bold: true, 
          bgColor: "E9D5FF",
          color: row.q3Goal ? (Number(row.q3.actual) > row.q3Goal ? "16A34A" : Number(row.q3.actual) < row.q3Goal ? "991B1B" : "000000") : "000000"
        }),
        createDataCell(row.q4Goal ? formatValue(row.q4Goal) : formatValue(row.q4.projection), { bgColor: "F3E8FF" }),
        createDataCell(formatValue(row.q4.actual), { 
          bold: true, 
          bgColor: "E9D5FF",
          color: row.q4Goal ? (Number(row.q4.actual) > row.q4Goal ? "16A34A" : Number(row.q4.actual) < row.q4Goal ? "991B1B" : "000000") : "000000"
        }),
        createDataCell(row.q1Goal || row.q2Goal || row.q3Goal || row.q4Goal 
          ? formatValue((row.q1Goal || 0) + (row.q2Goal || 0) + (row.q3Goal || 0) + (row.q4Goal || 0))
          : formatValue(row.goal), { bold: true, bgColor: "D1FAE5" }),
      ],
    });
  });

  const formRows = formSubmissions.map((form, idx) => {
    const rowIndex = rows.length + idx;
    const bgColor = rowIndex % 2 === 0 ? "FFFFFF" : "F5F5F5";
    const hasGoals = form.q1Goal || form.q2Goal || form.q3Goal || form.q4Goal;
    
    return new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: form.formName,
                  bold: true,
                  color: PURPLE_COLOR,
                  size: 18,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Form Submissions",
                  size: 16,
                  color: "666666",
                }),
              ],
            }),
          ],
          shading: { type: ShadingType.SOLID, color: bgColor },
        }),
        createDataCell("-", { bold: true, bgColor }),
        createDataCell(form.q1Goal ? formatValue(form.q1Goal) : "-", { bgColor: "F3E8FF" }),
        createDataCell(formatValue(form.Q1), { 
          bold: true, 
          bgColor: "E9D5FF",
          color: form.q1Goal ? (form.Q1 > form.q1Goal ? "16A34A" : form.Q1 < form.q1Goal ? "991B1B" : "000000") : "000000"
        }),
        createDataCell(form.q2Goal ? formatValue(form.q2Goal) : "-", { bgColor: "F3E8FF" }),
        createDataCell(formatValue(form.Q2), { 
          bold: true, 
          bgColor: "E9D5FF",
          color: form.q2Goal ? (form.Q2 > form.q2Goal ? "16A34A" : form.Q2 < form.q2Goal ? "991B1B" : "000000") : "000000"
        }),
        createDataCell(form.q3Goal ? formatValue(form.q3Goal) : "-", { bgColor: "F3E8FF" }),
        createDataCell(formatValue(form.Q3), { 
          bold: true, 
          bgColor: "E9D5FF",
          color: form.q3Goal ? (form.Q3 > form.q3Goal ? "16A34A" : form.Q3 < form.q3Goal ? "991B1B" : "000000") : "000000"
        }),
        createDataCell(form.q4Goal ? formatValue(form.q4Goal) : "-", { bgColor: "F3E8FF" }),
        createDataCell(formatValue(form.Q4), { 
          bold: true, 
          bgColor: "E9D5FF",
          color: form.q4Goal ? (form.Q4 > form.q4Goal ? "16A34A" : form.Q4 < form.q4Goal ? "991B1B" : "000000") : "000000"
        }),
        createDataCell(hasGoals ? formatValue(form.yearGoalTotal || 0) : formatValue(form.total), { bold: true, bgColor: "D1FAE5" }),
      ],
    });
  });

  const listRows = hubspotLists.map((list, idx) => {
    const rowIndex = rows.length + formSubmissions.length + idx;
    const bgColor = rowIndex % 2 === 0 ? "FFFFFF" : "F5F5F5";
    
    return new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: list.listName,
                  bold: true,
                  color: PURPLE_COLOR,
                  size: 18,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "List Members",
                  size: 16,
                  color: "666666",
                }),
              ],
            }),
          ],
          shading: { type: ShadingType.SOLID, color: bgColor },
        }),
        createDataCell("-", { bold: true, bgColor }),
        createDataCell("-", { bgColor: "F3E8FF" }),
        createDataCell("-", { bgColor: "E9D5FF" }),
        createDataCell("-", { bgColor: "F3E8FF" }),
        createDataCell("-", { bgColor: "E9D5FF" }),
        createDataCell("-", { bgColor: "F3E8FF" }),
        createDataCell("-", { bgColor: "E9D5FF" }),
        createDataCell("-", { bgColor: "F3E8FF" }),
        createDataCell("-", { bgColor: "E9D5FF" }),
        createDataCell(formatValue(list.memberCount), { bold: true, bgColor: "D1FAE5" }),
      ],
    });
  });

  return new Table({
    rows: [headerRow, ...dataRows, ...formRows, ...listRows],
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    },
  });
};

const createVerifiedDataTable = (verified: ReportData["verifiedData"]): Table => {
  if (!verified) {
    return new Table({ rows: [] });
  }

  const dataRows = [
    { label: "Total Deals", value: verified.totalDeals.toLocaleString() },
    { label: "Total Deal Value", value: formatCurrency(verified.totalDealValue), color: "16A34A" },
    { label: "Closed Won Deals", value: verified.closedWonDeals.toLocaleString() },
    { label: "Closed Won Value", value: formatCurrency(verified.closedWonValue), color: "16A34A" },
    { label: "Open Deals", value: verified.openDeals.toLocaleString() },
    { label: "Open Pipeline Value", value: formatCurrency(verified.openDealsValue), color: "F97316" },
    { label: "Total Contacts", value: verified.totalContacts.toLocaleString() },
    { label: "Total Companies", value: verified.totalCompanies.toLocaleString() },
  ];

  if (verified.pageViews !== undefined && verified.pageViews > 0) {
    dataRows.push({ label: "Total Page Views", value: verified.pageViews.toLocaleString(), color: "2563EB" });
  }

  const headerRow = new TableRow({
    children: [
      createHeaderCell("Metric"),
      createHeaderCell("Value"),
    ],
  });

  const rows = dataRows.map((item, idx) => {
    const bgColor = idx % 2 === 0 ? "FFFFFF" : "F5F5F5";
    return new TableRow({
      children: [
        createDataCell(item.label, { bold: true, bgColor, alignment: AlignmentType.LEFT }),
        createDataCell(item.value, { bold: true, color: item.color || "000000", bgColor }),
      ],
    });
  });

  return new Table({
    rows: [headerRow, ...rows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    },
  });
};

const createDealsByStageTable = (dealsByStage: { stage: string; count: number; value: number }[]): Table => {
  const headerRow = new TableRow({
    children: [
      createHeaderCell("Stage"),
      createHeaderCell("Count"),
      createHeaderCell("Value"),
    ],
  });

  const rows = dealsByStage.map((item, idx) => {
    const bgColor = idx % 2 === 0 ? "FFFFFF" : "F5F5F5";
    return new TableRow({
      children: [
        createDataCell(item.stage, { bold: true, bgColor, alignment: AlignmentType.LEFT }),
        createDataCell(item.count.toLocaleString(), { bgColor }),
        createDataCell(formatCurrency(item.value), { bgColor, color: "16A34A" }),
      ],
    });
  });

  return new Table({
    rows: [headerRow, ...rows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    },
  });
};

const createDealsByOwnerTable = (dealsByOwner: { owner: string; count: number; value: number }[]): Table => {
  const headerRow = new TableRow({
    children: [
      createHeaderCell("Owner"),
      createHeaderCell("Count"),
      createHeaderCell("Value"),
    ],
  });

  const rows = dealsByOwner.map((item, idx) => {
    const bgColor = idx % 2 === 0 ? "FFFFFF" : "F5F5F5";
    return new TableRow({
      children: [
        createDataCell(item.owner, { bold: true, bgColor, alignment: AlignmentType.LEFT }),
        createDataCell(item.count.toLocaleString(), { bgColor }),
        createDataCell(formatCurrency(item.value), { bgColor, color: "16A34A" }),
      ],
    });
  });

  return new Table({
    rows: [headerRow, ...rows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    },
  });
};

const createLifecycleStagesTable = (lifecycleStages: ReportData["lifecycleStages"], year: number): Table => {
  if (!lifecycleStages) return new Table({ rows: [] });

  const headerRow = new TableRow({
    children: [
      createHeaderCell("Stage"),
      createHeaderCell("Current Count"),
      createHeaderCell("Q1 Became"),
      createHeaderCell("Q2 Became"),
      createHeaderCell("Q3 Became"),
      createHeaderCell("Q4 Became"),
      createHeaderCell("Total Became"),
    ],
  });

  const stages = Object.keys({ ...lifecycleStages.currentCounts, ...lifecycleStages.quarterlyBecame });
  
  const rows = stages.map((stage, idx) => {
    const bgColor = idx % 2 === 0 ? "FFFFFF" : "F5F5F5";
    const quarterly = lifecycleStages.quarterlyBecame?.[stage] || { Q1: 0, Q2: 0, Q3: 0, Q4: 0, total: 0 };
    
    return new TableRow({
      children: [
        createDataCell(stage, { bold: true, bgColor, alignment: AlignmentType.LEFT }),
        createDataCell((lifecycleStages.currentCounts?.[stage] || 0).toLocaleString(), { bgColor }),
        createDataCell(quarterly.Q1.toLocaleString(), { bgColor }),
        createDataCell(quarterly.Q2.toLocaleString(), { bgColor }),
        createDataCell(quarterly.Q3.toLocaleString(), { bgColor }),
        createDataCell(quarterly.Q4.toLocaleString(), { bgColor }),
        createDataCell(quarterly.total.toLocaleString(), { bold: true, bgColor: "F3E8FF" }),
      ],
    });
  });

  return new Table({
    rows: [headerRow, ...rows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    },
  });
};

const createInsightsList = (title: string, insights: string[], color: string = PURPLE_COLOR): Paragraph[] => {
  const elements: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          color,
          size: 28,
        }),
      ],
      spacing: { before: 400, after: 200 },
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 12,
          color,
        },
      },
    }),
  ];

  insights.forEach((insight) => {
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `• ${insight}`,
            size: 22,
          }),
        ],
        spacing: { before: 100, after: 100 },
        indent: { left: 360 },
      })
    );
  });

  return elements;
};

export async function exportReportToWord(report: ReportData): Promise<void> {
  const sections: Paragraph[] = [];

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: report.title,
          bold: true,
          size: 48,
          color: "000000",
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 100 },
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: report.subtitle,
          size: 32,
          color: "666666",
        }),
      ],
      spacing: { after: 400 },
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "KPI Performance:",
          bold: true,
          color: PURPLE_COLOR,
          size: 32,
        }),
      ],
      spacing: { before: 300, after: 200 },
    })
  );

  const docElements: (Paragraph | Table)[] = [...sections];

  if (report.kpiTable && report.kpiTable.rows.length > 0) {
    docElements.push(
      createKPITable(
        report.kpiTable.rows,
        report.kpiTable.year,
        report.formSubmissions || [],
        report.hubspotLists || []
      )
    );
  } else if (report.verifiedData) {
    docElements.push(createVerifiedDataTable(report.verifiedData));
  }

  if (report.gaChannels && report.gaChannels.length > 0) {
    docElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Traffic Analysis:",
            bold: true,
            color: PURPLE_COLOR,
            size: 32,
          }),
        ],
        spacing: { before: 400, after: 200 },
      })
    );

    const channelRows = report.gaChannels.map((channel, idx) => {
      const bgColor = idx % 2 === 0 ? "FFFFFF" : "F5F5F5";
      return new TableRow({
        children: [
          createDataCell(channel.channel, { bold: true, bgColor, alignment: AlignmentType.LEFT }),
          createDataCell(channel.sessions.toLocaleString(), { bgColor }),
          createDataCell(`${channel.percentage}%`, { bgColor }),
        ],
      });
    });

    docElements.push(new Table({
      rows: [
        new TableRow({
          children: [
            createHeaderCell("Channel"),
            createHeaderCell("Sessions"),
            createHeaderCell("%"),
          ],
        }),
        ...channelRows
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      },
    }));
  }

  if (report.lifecycleStages) {
    docElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Lifecycle Stages:",
            bold: true,
            color: PURPLE_COLOR,
            size: 32,
          }),
        ],
        spacing: { before: 400, after: 200 },
      })
    );
    docElements.push(createLifecycleStagesTable(report.lifecycleStages, report.kpiTable?.year || new Date().getFullYear()));
  }

  if (report.revenueInsights && report.revenueInsights.length > 0) {
    docElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Insights:",
            bold: true,
            color: PURPLE_COLOR,
            size: 36,
          }),
        ],
        spacing: { before: 600, after: 200 },
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 12,
            color: PURPLE_COLOR,
          },
        },
      })
    );

    docElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Revenue Generation:",
            bold: true,
            color: PURPLE_COLOR,
            size: 28,
          }),
        ],
        spacing: { before: 300, after: 100 },
      })
    );

    report.revenueInsights.forEach((insight) => {
      docElements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `• ${insight}`,
              size: 22,
            }),
          ],
          spacing: { before: 80, after: 80 },
          indent: { left: 360 },
        })
      );
    });
  }

  if (report.leadGenInsights && report.leadGenInsights.length > 0) {
    docElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Lead Gen & Nurturing:",
            bold: true,
            color: PURPLE_COLOR,
            size: 28,
          }),
        ],
        spacing: { before: 300, after: 100 },
      })
    );

    report.leadGenInsights.forEach((insight) => {
      docElements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `• ${insight}`,
              size: 22,
            }),
          ],
          spacing: { before: 80, after: 80 },
          indent: { left: 360 },
        })
      );
    });
  }

  if (report.recommendations && report.recommendations.length > 0) {
    docElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Recommendations:",
            bold: true,
            color: RED_COLOR,
            size: 36,
          }),
        ],
        spacing: { before: 600, after: 200 },
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 12,
            color: RED_COLOR,
          },
        },
      })
    );

    report.recommendations.forEach((rec) => {
      docElements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `• ${rec}`,
              size: 22,
            }),
          ],
          spacing: { before: 80, after: 80 },
          indent: { left: 360 },
        })
      );
    });
  }

  const doc = new Document({
    sections: [
      {
        children: docElements,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `${report.title.replace(/[^a-z0-9]/gi, "_")}_Report.docx`;
  saveAs(blob, filename);
}
