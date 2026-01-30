import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Download, RefreshCw, AlertCircle, ExternalLink, FileText, Target, PieChart as PieChartIcon, MessageSquare, Send, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { KPITable } from "./KPITable";
import { ChannelPieChart } from "./ChannelPieChart";
import { LifecycleStagesTable } from "./LifecycleStagesTable";
import { BusinessProfileCard } from "./BusinessProfileCard";
import { cn } from "@/lib/utils";
import { exportReportToWord } from "@/lib/exportToWord";
import { useQuery } from "@tanstack/react-query";

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

interface LifecycleStageData {
  currentCounts: Record<string, number>;
  quarterlyBecame: Record<string, { Q1: number; Q2: number; Q3: number; Q4: number; total: number }>;
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
  gaChannels?: any[];
  gaPageViews?: any;
  lifecycleStages?: LifecycleStageData;
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

const currentYear = new Date().getFullYear();
const availableYears = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

interface QAMessage {
  role: "user" | "assistant";
  content: string;
}

export function ReportView() {
  const { selectedAccount, conversationId } = useAuth();
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  
  const [preGenPrompt, setPreGenPrompt] = useState("");
  const [showPreGenPrompt, setShowPreGenPrompt] = useState(false);
  
  const [qaMessages, setQaMessages] = useState<QAMessage[]>([]);
  const [qaInput, setQaInput] = useState("");
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const [lastReportContext, setLastReportContext] = useState<any>(null);

  const handleExportToWord = async () => {
    if (!report) return;
    setIsExporting(true);
    try {
      const exportData = {
        ...report,
        kpiTable: report.kpiTable ? {
          ...report.kpiTable,
          rows: enrichedKpiRows
        } : undefined,
        mqlSqlData: enrichedMqlSqlData,
      };
      await exportReportToWord(exportData);
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
    setQaMessages([]);

    try {
      const result = await api.generateReport(
        conversationId || "", 
        selectedAccount, 
        selectedYear,
        preGenPrompt.trim() || undefined
      );
      if (result.reportData) {
        setReport(result.reportData);
        setLastReportContext(result.reportContext || result.reportData);
      } else {
        setReport(result);
        setLastReportContext(result);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate report");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!qaInput.trim() || !selectedAccount || !lastReportContext) return;

    const question = qaInput.trim();
    setQaInput("");
    setQaMessages(prev => [...prev, { role: "user", content: question }]);
    setIsAskingQuestion(true);

    try {
      const response = await api.askReportQuestion(
        selectedAccount,
        question,
        lastReportContext,
        selectedYear
      );
      setQaMessages(prev => [...prev, { role: "assistant", content: response.answer }]);
    } catch (err: any) {
      setQaMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I couldn't process that question. Please try again." 
      }]);
    } finally {
      setIsAskingQuestion(false);
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

  const { data: kpiGoals } = useQuery<any[]>({
    queryKey: [`/api/kpi-goals/${selectedAccount}`],
    enabled: !!selectedAccount,
  });

  const { data: lifecycleSettings } = useQuery<{ mqlStage: string | null; sqlStage: string | null }>({
    queryKey: [`/api/lifecycle-stage-settings/${selectedAccount}`],
    enabled: !!selectedAccount,
  });

  const { data: mqlSqlData, isLoading: isMqlSqlLoading } = useQuery<{
    mql: { Q1: number; Q2: number; Q3: number; Q4: number; total: number };
    sql: { Q1: number; Q2: number; Q3: number; Q4: number; total: number };
    conversionRate: { Q1: number; Q2: number; Q3: number; Q4: number; total: number };
    settings: { mqlStage: string | null; sqlStage: string | null };
  }>({
    queryKey: [`/api/mql-sql-counts/${selectedAccount}`, selectedYear, lifecycleSettings?.mqlStage, lifecycleSettings?.sqlStage],
    queryFn: async () => {
      const response = await fetch(`/api/mql-sql-counts/${selectedAccount}?year=${selectedYear}`);
      if (!response.ok) throw new Error('Failed to fetch MQL/SQL data');
      return response.json();
    },
    enabled: !!selectedAccount && !!(lifecycleSettings?.mqlStage || lifecycleSettings?.sqlStage),
  });

  const enrichedKpiRows = (report?.kpiTable?.rows || [])
    .filter(row => row.metric !== "MQLs" && row.metric !== "SQLs")
    .map(row => {
    // Find goal for this specific metric and year
    // Handle "New Contacts" vs "Contacts" naming discrepancy
    const metricName = row.metric === "New Contacts" ? "Contacts" : row.metric;
    const goals = kpiGoals?.find(g => 
      g.metric.toLowerCase() === metricName.toLowerCase() && 
      g.year === (report?.kpiTable?.year || currentYear)
    );
    
    if (goals) {
      return {
        ...row,
        q1Goal: goals.q1Goal || 0,
        q2Goal: goals.q2Goal || 0,
        q3Goal: goals.q3Goal || 0,
        q4Goal: goals.q4Goal || 0,
      };
    }
    return row;
  });

  const enrichedMqlSqlData = mqlSqlData ? {
    ...mqlSqlData,
    mqlGoals: (() => {
      const mqlGoals = kpiGoals?.find(g => 
        g.metric.toLowerCase() === 'mqls' && 
        g.year === (report?.kpiTable?.year || currentYear)
      );
      return mqlGoals ? {
        q1Goal: mqlGoals.q1Goal || 0,
        q2Goal: mqlGoals.q2Goal || 0,
        q3Goal: mqlGoals.q3Goal || 0,
        q4Goal: mqlGoals.q4Goal || 0,
      } : undefined;
    })(),
    sqlGoals: (() => {
      const sqlGoals = kpiGoals?.find(g => 
        g.metric.toLowerCase() === 'sqls' && 
        g.year === (report?.kpiTable?.year || currentYear)
      );
      return sqlGoals ? {
        q1Goal: sqlGoals.q1Goal || 0,
        q2Goal: sqlGoals.q2Goal || 0,
        q3Goal: sqlGoals.q3Goal || 0,
        q4Goal: sqlGoals.q4Goal || 0,
      } : undefined;
    })(),
  } : undefined;

  const { data: pipelineData } = useQuery<any[]>({
    queryKey: [`/api/pipeline-metrics/${selectedAccount}`, selectedYear, report?.title],
    queryFn: async () => {
      const response = await fetch(`/api/pipeline-metrics/${selectedAccount}?year=${selectedYear}`);
      if (!response.ok) throw new Error('Failed to fetch pipeline metrics');
      const data = await response.json();
      console.log("Pipeline metrics received:", data);
      return data;
    },
    enabled: !!selectedAccount && !!report,
  });

  console.log("Rendering ReportView with pipelineData:", pipelineData);

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
            
            <div className="text-left max-w-lg mx-auto">
              <button
                type="button"
                onClick={() => setShowPreGenPrompt(!showPreGenPrompt)}
                className="flex items-center gap-2 text-sm font-medium text-[#5C3D5E] hover:text-[#5C3D5E]/80 transition-colors mb-2"
                data-testid="button-toggle-focus-areas"
              >
                <Sparkles className="w-4 h-4" />
                <span>Add focus areas (optional)</span>
                {showPreGenPrompt ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <AnimatePresence>
                {showPreGenPrompt && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Textarea
                      placeholder="Tell me what you'd like the report to focus on... (e.g., 'Look for attribution sources for closed-won deals' or 'Focus on Q4 performance trends')"
                      value={preGenPrompt}
                      onChange={(e) => setPreGenPrompt(e.target.value)}
                      className="min-h-[100px] text-sm resize-none"
                      data-testid="input-focus-areas"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      The AI will prioritize these areas while still generating comprehensive insights.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
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

  const shouldWaitForMqlSql = (lifecycleSettings?.mqlStage || lifecycleSettings?.sqlStage) && isMqlSqlLoading;
  
  if (shouldWaitForMqlSql) {
    return (
      <div className="w-full max-w-3xl mx-auto p-6 md:p-10">
        <Card className="text-center py-12">
          <CardContent className="space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Loading Report Data</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Fetching MQL/SQL lifecycle data for {selectedYear}...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 p-6 md:p-10 animate-in-up">
      {/* Header Section */}
      <div className="border-b border-border pb-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-report-title">
              Jan - Dec {report.kpiTable?.year || selectedYear} Report
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
              onClick={() => setShowPreGenPrompt(!showPreGenPrompt)}
              data-testid="button-toggle-focus-areas-header"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Focus Areas
            </Button>
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
        
        <AnimatePresence>
          {showPreGenPrompt && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="pt-2"
            >
              <Textarea
                placeholder="Tell me what you'd like the report to focus on... (e.g., 'Look for attribution sources for closed-won deals')"
                value={preGenPrompt}
                onChange={(e) => setPreGenPrompt(e.target.value)}
                className="min-h-[80px] text-sm resize-none"
                data-testid="input-focus-areas-header"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Click Refresh to regenerate with these focus areas.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Google Business Profile Section */}
      {report.googleBusinessProfile && (
        <section className="space-y-4">
          <BusinessProfileCard data={report.googleBusinessProfile} />
        </section>
      )}

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

        {enrichedKpiRows.length > 0 ? (
          <KPITable 
            rows={enrichedKpiRows} 
            year={report.kpiTable?.year}
            formSubmissions={report.formSubmissions}
            hubspotLists={report.hubspotLists}
            mqlSqlData={enrichedMqlSqlData}
            pipelineMetrics={pipelineData}
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
                  {verified.pageViews !== undefined && verified.pageViews > 0 && (
                    <TableRow>
                      <TableCell className="font-medium">Total Page Views</TableCell>
                      <TableCell className="text-right font-mono font-bold text-blue-600">{verified.pageViews.toLocaleString()}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </section>

      {/* Traffic Analysis Section */}
      {report.gaChannels && report.gaChannels.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-[#5C3D5E]" />
            <h2 className="text-xl font-semibold text-[#5C3D5E]">Traffic Analysis:</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChannelPieChart 
              data={report.gaChannels} 
              year={report.kpiTable?.year || currentYear} 
            />
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-[#5C3D5E]">Channel Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead className="text-right">Sessions</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.gaChannels.map((channel, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{channel.channel}</TableCell>
                        <TableCell className="text-right font-mono">{channel.sessions.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono">{channel.percentage}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Lifecycle Stages Section */}
      {report.lifecycleStages && (
        Object.keys(report.lifecycleStages.quarterlyBecame || {}).length > 0 ||
        Object.keys(report.lifecycleStages.currentCounts || {}).length > 0
      ) && (
        <section className="space-y-4">
          <LifecycleStagesTable 
            data={report.lifecycleStages} 
            year={report.kpiTable?.year || currentYear} 
          />
        </section>
      )}

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

      {/* Q&A Section */}
      <motion.section 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#5C3D5E]" />
          <h2 className="text-xl font-semibold text-[#5C3D5E]">Ask Questions About This Report</h2>
        </div>
        <Card className="border-[#5C3D5E]/20">
          <CardContent className="pt-6 space-y-4">
            {qaMessages.length > 0 && (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {qaMessages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "p-3 rounded-lg text-sm",
                      msg.role === "user" 
                        ? "bg-[#5C3D5E]/10 ml-8" 
                        : "bg-muted mr-8"
                    )}
                  >
                    <div className="font-medium text-xs text-muted-foreground mb-1">
                      {msg.role === "user" ? "You" : "AI Assistant"}
                    </div>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                ))}
                {isAskingQuestion && (
                  <div className="bg-muted mr-8 p-3 rounded-lg text-sm">
                    <div className="font-medium text-xs text-muted-foreground mb-1">AI Assistant</div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Analyzing...
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder='Ask a question about the report... (e.g., "Identify the source and attribution model for closed-won deals")'
                value={qaInput}
                onChange={(e) => setQaInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAskQuestion()}
                disabled={isAskingQuestion}
                className="flex-1"
                data-testid="input-qa-question"
              />
              <Button
                onClick={handleAskQuestion}
                disabled={isAskingQuestion || !qaInput.trim()}
                size="icon"
                data-testid="button-ask-question"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ask clarifying questions about any data or insights in this report.
            </p>
          </CardContent>
        </Card>
      </motion.section>
    </div>
  );
}
