import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Share2, ExternalLink } from "lucide-react";
import { MOCK_REPORT_DATA } from "@/lib/mockData";
import { motion } from "framer-motion";

export function ReportView() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 p-6 md:p-10 animate-in-up">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-6 w-1 bg-primary rounded-full" />
            <h1 className="text-3xl font-display font-bold text-foreground">{MOCK_REPORT_DATA.title}</h1>
          </div>
          <p className="text-xl text-muted-foreground">{MOCK_REPORT_DATA.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* KPI Performance Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-primary">KPI Performance</h2>
          <div className="flex gap-4 text-sm text-primary underline cursor-pointer">
            <span className="flex items-center gap-1"><ExternalLink className="w-3 h-3" /> HubSpot Reporting Dashboard</span>
            <span className="flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Revenue Attribution</span>
          </div>
        </div>

        <Card className="overflow-hidden border-border/60 shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[200px] font-bold text-foreground">Metric</TableHead>
                  <TableHead className="text-right">2025 Year-End</TableHead>
                  <TableHead className="text-right">Q1</TableHead>
                  <TableHead className="text-right text-muted-foreground">Actuals</TableHead>
                  <TableHead className="text-right">Q2</TableHead>
                  <TableHead className="text-right text-muted-foreground">Actuals</TableHead>
                  <TableHead className="text-right">Q3</TableHead>
                  <TableHead className="text-right text-muted-foreground">Actuals</TableHead>
                  <TableHead className="text-right">Q4</TableHead>
                  <TableHead className="text-right text-muted-foreground">Actuals</TableHead>
                  <TableHead className="text-right font-bold bg-primary/5">Goal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_REPORT_DATA.kpiData.map((row, i) => (
                  <TableRow key={i} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-primary">{row.metric}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{row.projection}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{row.q1}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-red-500 bg-red-50/50 dark:bg-red-900/10 rounded">{row.q1_actual}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{row.q2}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-orange-500">{row.q2_actual}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{row.q3}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{row.q3_actual}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{row.q4}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-primary">{row.q4_actual}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold bg-primary/5">{row.goal}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </section>

      {/* Insights Section */}
      <section className="grid md:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <Card className="h-full border-l-4 border-l-purple-500 shadow-md">
            <CardHeader>
              <CardTitle className="text-purple-600 dark:text-purple-400">Revenue Generation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground marker:text-purple-500">
                {MOCK_REPORT_DATA.revenueInsights.map((insight, i) => (
                  <li key={i} className="leading-relaxed">
                    {insight}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full border-l-4 border-l-blue-500 shadow-md">
            <CardHeader>
              <CardTitle className="text-blue-600 dark:text-blue-400">Lead Gen & Nurturing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground marker:text-blue-500">
                {MOCK_REPORT_DATA.leadGenInsights.map((insight, i) => (
                  <li key={i} className="leading-relaxed">
                    {insight}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Recommendations Section */}
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
               {MOCK_REPORT_DATA.recommendations.map((rec, i) => (
                 <li key={i} className="flex gap-3 text-sm">
                   <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-destructive mt-2" />
                   <span className="text-foreground/90 leading-relaxed">{rec}</span>
                 </li>
               ))}
             </ul>
          </CardContent>
        </Card>
      </motion.section>
    </div>
  );
}
