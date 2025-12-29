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

interface ReportData {
  title: string;
  subtitle: string;
  kpiTable?: {
    year: number;
    rows: KPIRow[];
  };
  formSubmissions?: FormSubmissionData[];
  dealsByStage?: { stage: string; count: number; value: number }[];
  dealsByOwner?: { owner: string; count: number; value: number }[];
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

const createKPITable = (rows: KPIRow[], year: number, formSubmissions: FormSubmissionData[] = []): Table => {
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
        createDataCell(formatValue(row.q1.projection), { bgColor: "F3E8FF" }),
        createDataCell(formatValue(row.q1.actual), { bgColor: "E9D5FF" }),
        createDataCell(formatValue(row.q2.projection), { bgColor: "F3E8FF" }),
        createDataCell(formatValue(row.q2.actual), { bgColor: "E9D5FF" }),
        createDataCell(formatValue(row.q3.projection), { bgColor: "F3E8FF" }),
        createDataCell(formatValue(row.q3.actual), { bgColor: "E9D5FF" }),
        createDataCell(formatValue(row.q4.projection), { bgColor: "F3E8FF" }),
        createDataCell(formatValue(row.q4.actual), { bgColor: "E9D5FF" }),
        createDataCell(formatValue(row.goal), { bold: true, bgColor: "D1FAE5" }),
      ],
    });
  });

  const formRows = formSubmissions.map((form, idx) => {
    const rowIndex = rows.length + idx;
    const bgColor = rowIndex % 2 === 0 ? "FFFFFF" : "F5F5F5";
    
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
        createDataCell("-", { bgColor: "F3E8FF" }),
        createDataCell(formatValue(form.Q1), { bold: true, bgColor: "E9D5FF" }),
        createDataCell("-", { bgColor: "F3E8FF" }),
        createDataCell(formatValue(form.Q2), { bold: true, bgColor: "E9D5FF" }),
        createDataCell("-", { bgColor: "F3E8FF" }),
        createDataCell(formatValue(form.Q3), { bold: true, bgColor: "E9D5FF" }),
        createDataCell("-", { bgColor: "F3E8FF" }),
        createDataCell(formatValue(form.Q4), { bold: true, bgColor: "E9D5FF" }),
        createDataCell(formatValue(form.total), { bold: true, bgColor: "D1FAE5" }),
      ],
    });
  });

  return new Table({
    rows: [headerRow, ...dataRows, ...formRows],
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
        report.formSubmissions || []
      )
    );
  } else if (report.verifiedData) {
    docElements.push(createVerifiedDataTable(report.verifiedData));
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
