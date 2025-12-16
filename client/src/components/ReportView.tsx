import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, AlertCircle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

interface KPIMetric {
  metric: string;
  value: number | string;
}

interface StageData {
  stage: string;
  count: number;
  value: number;
}

interface OwnerData {
  owner: string;
  count: number;
  value: number;
}

interface ReportData {
  title: string;
  subtitle: string;
  kpiMetrics?: KPIMetric[];
  dealsByStage?: StageData[];
  dealsByOwner?: OwnerData[];
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

export function ReportView() {
  const { selectedAccount, conversationId } = useAuth();
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    if (!selectedAccount) {
      setError("No HubSpot account selected");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await api.generateReport(conversationId || "", selectedAccount);
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

  const formatNumber = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Show generate button if no report
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
                Click below to analyze your HubSpot data and generate a comprehensive report with real metrics from your CRM.
              </p>
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
                  Analyzing HubSpot Data...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Report
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
    <div className="w-full max-w-5xl mx-auto space-y-8 p-6 md:p-10 animate-in-up">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-report-title">
            {report.title}
          </h1>
          <p className="text-xl text-muted-foreground">{report.subtitle}</p>
        </div>
        <div className="flex gap-2">
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
        </div>
      </div>

      {/* KPI Performance Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-primary">KPI Performance</h2>
          <div className="flex gap-4 text-sm text-primary underline cursor-pointer">
            <span className="flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> HubSpot Reporting Dashboard
            </span>
          </div>
        </div>

        <Card className="overflow-hidden border-border/60 shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-bold text-foreground">Metric</TableHead>
                  <TableHead className="text-right font-bold">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verified && (
                  <>
                    <TableRow>
                      <TableCell className="font-medium">Total Deals</TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">{verified.totalDeals}</TableCell>
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
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </section>

      {/* Deals by Stage */}
      {report.dealsByStage && report.dealsByStage.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-primary">Deals by Stage</h2>
          <Card className="overflow-hidden border-border/60 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold">Stage</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.dealsByStage.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.stage}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(row.value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>
      )}

      {/* Insights Section - Matches the user's format */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-primary border-b border-primary pb-2">Insights:</h2>
        
        {/* Revenue Generation */}
        {report.revenueInsights && report.revenueInsights.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-l-4 border-l-purple-500 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-purple-600 dark:text-purple-400 text-lg">Revenue Generation:</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2 text-sm text-foreground marker:text-purple-500">
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
            <Card className="border-l-4 border-l-blue-500 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-blue-600 dark:text-blue-400 text-lg">Lead Gen & Nurturing:</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2 text-sm text-foreground marker:text-blue-500">
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
          <h2 className="text-2xl font-bold text-destructive border-b border-destructive pb-2">Recommendations:</h2>
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="pt-6">
              <ul className="list-disc pl-5 space-y-3">
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
