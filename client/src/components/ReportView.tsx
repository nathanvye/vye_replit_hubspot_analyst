import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

interface ReportData {
  title: string;
  subtitle: string;
  dataSummary: {
    totalDeals: number;
    totalContacts: number;
    totalCompanies: number;
    totalDealValue: number;
  };
  dealsByStage?: { stage: string; count: number; value: number }[];
  dealsByOwner?: { owner: string; count: number; value: number }[];
  dealAnalysis?: string[];
  contactAnalysis?: string[];
  recommendations?: string[];
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
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

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 p-6 md:p-10 animate-in-up">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-6 w-1 bg-primary rounded-full" />
            <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-report-title">
              {report.title}
            </h1>
          </div>
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

      {/* Data Summary Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          Data Summary (Verified from HubSpot)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="text-center p-4">
            <p className="text-3xl font-bold text-primary" data-testid="text-total-deals">
              {report.dataSummary.totalDeals}
            </p>
            <p className="text-sm text-muted-foreground">Total Deals</p>
          </Card>
          <Card className="text-center p-4">
            <p className="text-3xl font-bold text-green-600" data-testid="text-total-value">
              {formatCurrency(report.dataSummary.totalDealValue)}
            </p>
            <p className="text-sm text-muted-foreground">Total Deal Value</p>
          </Card>
          <Card className="text-center p-4">
            <p className="text-3xl font-bold text-blue-600" data-testid="text-total-contacts">
              {report.dataSummary.totalContacts}
            </p>
            <p className="text-sm text-muted-foreground">Total Contacts</p>
          </Card>
          <Card className="text-center p-4">
            <p className="text-3xl font-bold text-purple-600" data-testid="text-total-companies">
              {report.dataSummary.totalCompanies}
            </p>
            <p className="text-sm text-muted-foreground">Total Companies</p>
          </Card>
        </div>
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

      {/* Deals by Owner */}
      {report.dealsByOwner && report.dealsByOwner.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-primary">Deals by Owner</h2>
          <Card className="overflow-hidden border-border/60 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold">Owner</TableHead>
                  <TableHead className="text-right">Deals</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.dealsByOwner.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.owner}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(row.value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>
      )}

      {/* Analysis Section */}
      <section className="grid md:grid-cols-2 gap-6">
        {report.dealAnalysis && report.dealAnalysis.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <Card className="h-full border-l-4 border-l-purple-500 shadow-md">
              <CardHeader>
                <CardTitle className="text-purple-600 dark:text-purple-400">Deal Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground marker:text-purple-500">
                  {report.dealAnalysis.map((insight, i) => (
                    <li key={i} className="leading-relaxed">{insight}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {report.contactAnalysis && report.contactAnalysis.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full border-l-4 border-l-blue-500 shadow-md">
              <CardHeader>
                <CardTitle className="text-blue-600 dark:text-blue-400">Contact Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground marker:text-blue-500">
                  {report.contactAnalysis.map((insight, i) => (
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
          <h2 className="text-xl font-semibold text-destructive">Recommendations</h2>
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="pt-6">
              <ul className="space-y-3">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-destructive mt-2" />
                    <span className="text-foreground/90 leading-relaxed">{rec}</span>
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
