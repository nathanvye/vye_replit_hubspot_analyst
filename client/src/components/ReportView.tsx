import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, RefreshCw, AlertCircle, ExternalLink, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { KPITable } from "./KPITable";
import { cn } from "@/lib/utils";
import { exportReportToWord } from "@/lib/exportToWord";

interface KPIRow {
  metric: string;
  subtext?: string;
  yoyChange?: string;
  yearEndProjection: number | string;
  q1: { projection: number | string; actual: number | string | null };
  q2: { projection: number | string; actual: number | string | null };
  q3: { projection: number | string; actual: number | string | null };
  q4: { projection: number | string; actual: number | string | null };
  goal: number | string;
}

interface StageData {
  stage: string;
  count: number;
  value: number;
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
  dealsByStage?: StageData[];
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

const currentYear = new Date().getFullYear();
const availableYears = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

export function ReportView() {
  const { selectedAccount, conversationId } = useAuth();
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const handleExportToWord = async () => {
    if (!report) return;
    setIsExporting(true);
    try {
      await exportReportToWord(report);
    } catch (err: any) {
      console.error("Export error:", err);
      setError("Failed to export report to Word");
    } finally {
      setIsExporting(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedAccount) {
      setError("No HubSpot account selected");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await api.generateReport(conversationId || "", selectedAccount, selectedYear);
      if (result.reportData) {
        setReport(result.reportData);
      } else {
        setReport(result);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate report");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  if (!report) {
    return (
      <div className="w-full max-w-3xl mx-auto p-6 md:p-10">
        <Card className="text-center py-12">
          <CardContent className="space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Download className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Generate HubSpot Report</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Select a year and click below to analyze your HubSpot data and generate a comprehensive report with real metrics from your CRM.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Report Year:</span>
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-[120px]" data-testid="select-year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()} data-testid={`option-year-${year}`}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && (
              <div className="flex items-center justify-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
            <Button 
              size="lg" 
              onClick={handleGenerateReport}
              disabled={isLoading}
              data-testid="button-generate-report"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing HubSpot Data for {selectedYear}...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate {selectedYear} Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const verified = report.verifiedData;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 p-6 md:p-10 animate-in-up">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-report-title">
            {report.title}
          </h1>
          <p className="text-xl text-muted-foreground">{report.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select 
            value={selectedYear.toString()} 
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-[100px]" data-testid="select-year-header">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleGenerateReport}
            disabled={isLoading}
            data-testid="button-refresh-report"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleExportToWord}
            disabled={isExporting || isLoading}
            data-testid="button-export-word"
          >
            <FileText className={`w-4 h-4 mr-2 ${isExporting ? 'animate-pulse' : ''}`} />
            {isExporting ? 'Exporting...' : 'Export to Word'}
          </Button>
        </div>
      </div>

      {/* KPI Performance Table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#5C3D5E]">KPI Performance:</h2>
          <div className="flex gap-4 text-sm text-[#5C3D5E] underline cursor-pointer">
            <span className="flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> HubSpot Reporting Dashboard
            </span>
          </div>
        </div>

        {report.kpiTable && report.kpiTable.rows.length > 0 ? (
          <KPITable 
            rows={report.kpiTable.rows} 
            year={report.kpiTable.year}
            formSubmissions={report.formSubmissions}
            hubspotLists={report.hubspotLists}
          />
        ) : verified && (
          <Card className="overflow-hidden border-border/60 shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#5C3D5E] hover:bg-[#5C3D5E]">
                    <TableHead className="font-bold text-white">Metric</TableHead>
                    <TableHead className="text-right font-bold text-white">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Total Deals</TableCell>
                    <TableCell className="text-right font-mono font-bold text-[#5C3D5E]">{verified.totalDeals}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Total Deal Value</TableCell>
                    <TableCell className="text-right font-mono font-bold text-green-600">{formatCurrency(verified.totalDealValue)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Closed Won Deals</TableCell>
                    <TableCell className="text-right font-mono">{verified.closedWonDeals}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Closed Won Value</TableCell>
                    <TableCell className="text-right font-mono text-green-600">{formatCurrency(verified.closedWonValue)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Open Deals</TableCell>
                    <TableCell className="text-right font-mono">{verified.openDeals}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Open Pipeline Value</TableCell>
                    <TableCell className="text-right font-mono text-orange-500">{formatCurrency(verified.openDealsValue)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Total Contacts</TableCell>
                    <TableCell className="text-right font-mono">{verified.totalContacts}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Total Companies</TableCell>
                    <TableCell className="text-right font-mono">{verified.totalCompanies}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </section>

      {/* Insights Section */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-[#5C3D5E] border-b-2 border-[#5C3D5E] pb-2">Insights:</h2>
        
        {/* Revenue Generation */}
        {report.revenueInsights && report.revenueInsights.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-l-4 border-l-[#5C3D5E] shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#5C3D5E] text-lg">Revenue Generation:</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2 text-sm text-foreground marker:text-[#5C3D5E]">
                  {report.revenueInsights.map((insight, i) => (
                    <li key={i} className="leading-relaxed">{insight}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Lead Gen & Nurturing */}
        {report.leadGenInsights && report.leadGenInsights.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-l-4 border-l-[#5C3D5E] shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#5C3D5E] text-lg">Lead Gen & Nurturing:</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2 text-sm text-foreground marker:text-[#5C3D5E]">
                  {report.leadGenInsights.map((insight, i) => (
                    <li key={i} className="leading-relaxed">{insight}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </section>

      {/* Recommendations Section */}
      {report.recommendations && report.recommendations.length > 0 && (
        <motion.section 
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold text-red-700 border-b-2 border-red-700 pb-2">Recommendations:</h2>
          <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <ul className="list-disc pl-5 space-y-3 marker:text-red-700">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="text-sm leading-relaxed text-foreground">
                    {rec}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.section>
      )}
    </div>
  );
}
