import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Calendar, Download, RefreshCcw, TrendingUp, Users, DollarSign, MousePointer, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ReportingParams {
  campaigns?: string[];
  accounts?: string[];
  dateRange: {
    start: string;
    end: string;
  };
  pivot: 'CAMPAIGN' | 'ACCOUNT' | 'CREATIVE' | 'MEMBER_DEMOGRAPHICS';
  fields: string[];
}

interface ReportingData {
  campaignId?: string;
  campaignName?: string;
  accountId?: string;
  accountName?: string;
  impressions: number;
  clicks: number;
  costInUsd: number;
  conversions: number;
  dateRange: {
    start: { year: number; month: number; day: number };
    end: { year: number; month: number; day: number };
  };
  demographics?: any;
}

interface LinkedInCampaignReportingProps {
  campaigns: any[];
  accounts: any[];
}

export const LinkedInCampaignReporting = ({ campaigns, accounts }: LinkedInCampaignReportingProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reportingData, setReportingData] = useState<ReportingData[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end: new Date().toISOString().split('T')[0] // today
  });
  const [pivot, setPivot] = useState<'CAMPAIGN' | 'ACCOUNT' | 'CREATIVE' | 'MEMBER_DEMOGRAPHICS'>('CAMPAIGN');
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'impressions',
    'clicks', 
    'costInUsd',
    'externalWebsiteConversions'
  ]);

  const availableFields = [
    { value: 'impressions', label: 'Impressions', icon: Eye },
    { value: 'clicks', label: 'Clicks', icon: MousePointer },
    { value: 'costInUsd', label: 'Cost (USD)', icon: DollarSign },
    { value: 'externalWebsiteConversions', label: 'Conversions', icon: TrendingUp },
    { value: 'landingPageClicks', label: 'Landing Page Clicks', icon: MousePointer },
    { value: 'likes', label: 'Likes', icon: Users },
    { value: 'comments', label: 'Comments', icon: Users },
    { value: 'shares', label: 'Shares', icon: Users },
    { value: 'follows', label: 'Follows', icon: Users },
    { value: 'videoViews', label: 'Video Views', icon: Eye },
    { value: 'videoCompletions', label: 'Video Completions', icon: Eye }
  ];

  const pivotOptions = [
    { value: 'CAMPAIGN', label: 'By Campaign' },
    { value: 'ACCOUNT', label: 'By Account' },
    { value: 'CREATIVE', label: 'By Creative' },
    { value: 'MEMBER_DEMOGRAPHICS', label: 'By Demographics' }
  ];

  const generateReport = async () => {
    try {
      setLoading(true);
      
      const params: ReportingParams = {
        dateRange,
        pivot,
        fields: [...selectedFields, 'dateRange'] // Always include dateRange
      };

      // Add campaigns or accounts filter
      if (selectedCampaigns.length > 0) {
        params.campaigns = selectedCampaigns;
      } else if (selectedAccounts.length > 0) {
        params.accounts = selectedAccounts;
      } else {
        // Default to all available accounts
        params.accounts = accounts.map(account => account.id);
      }

      console.log('Generating report with params:', params);

      const { data, error } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: { 
          action: 'getCampaignReporting',
          ...params
        }
      });

      if (error) throw error;

      if (data.success) {
        setReportingData(data.data);
        toast({
          title: "Report Generated",
          description: `Successfully loaded ${data.data.length} reporting records`,
        });
      } else {
        throw new Error(data.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate campaign report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = () => {
    if (reportingData.length === 0) return null;

    const totals = reportingData.reduce((acc, item) => ({
      impressions: acc.impressions + (item.impressions || 0),
      clicks: acc.clicks + (item.clicks || 0),
      cost: acc.cost + (item.costInUsd || 0),
      conversions: acc.conversions + (item.conversions || 0)
    }), { impressions: 0, clicks: 0, cost: 0, conversions: 0 });

    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const cpc = totals.clicks > 0 ? totals.cost / totals.clicks : 0;
    const cpm = totals.impressions > 0 ? (totals.cost / totals.impressions) * 1000 : 0;
    const conversionRate = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;

    return {
      ...totals,
      ctr,
      cpc,
      cpm,
      conversionRate
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const prepareChartData = () => {
    return reportingData.map((item, index) => ({
      name: item.campaignName || item.accountName || `Item ${index + 1}`,
      impressions: item.impressions || 0,
      clicks: item.clicks || 0,
      cost: item.costInUsd || 0,
      conversions: item.conversions || 0,
      ctr: item.impressions > 0 ? ((item.clicks || 0) / item.impressions) * 100 : 0,
      cpc: item.clicks > 0 ? (item.costInUsd || 0) / item.clicks : 0
    }));
  };

  const exportToCSV = () => {
    if (reportingData.length === 0) {
      toast({
        title: "No Data",
        description: "No data available to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ['Name', 'Impressions', 'Clicks', 'Cost (USD)', 'Conversions', 'CTR (%)', 'CPC ($)'];
    const csvData = reportingData.map(item => [
      item.campaignName || item.accountName || 'Unknown',
      item.impressions || 0,
      item.clicks || 0,
      item.costInUsd || 0,
      item.conversions || 0,
      item.impressions > 0 ? (((item.clicks || 0) / item.impressions) * 100).toFixed(2) : '0',
      item.clicks > 0 ? ((item.costInUsd || 0) / item.clicks).toFixed(2) : '0'
    ]);

    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linkedin-campaign-report-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Report has been downloaded as CSV",
    });
  };

  const metrics = calculateMetrics();
  const chartData = prepareChartData();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            LinkedIn Campaign Reporting
          </CardTitle>
          <CardDescription>
            Generate detailed performance reports for your LinkedIn advertising campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="pivot">Report Pivot</Label>
              <Select value={pivot} onValueChange={(value: any) => setPivot(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pivotOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={generateReport} disabled={loading} className="w-full">
                {loading ? (
                  <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BarChart className="h-4 w-4 mr-2" />
                )}
                Generate Report
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label>Select Campaigns</Label>
              <Select value={selectedCampaigns.join(',')} onValueChange={(value) => setSelectedCampaigns(value ? value.split(',') : [])}>
                <SelectTrigger>
                  <SelectValue placeholder="All campaigns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Select Accounts</Label>
              <Select value={selectedAccounts.join(',')} onValueChange={(value) => setSelectedAccounts(value ? value.split(',') : [])}>
                <SelectTrigger>
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Impressions</span>
              </div>
              <p className="text-2xl font-bold">{metrics.impressions.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MousePointer className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Clicks</span>
              </div>
              <p className="text-2xl font-bold">{metrics.clicks.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">CTR: {formatPercentage(metrics.ctr)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Cost</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(metrics.cost)}</p>
              <p className="text-xs text-muted-foreground">CPC: {formatCurrency(metrics.cpc)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Conversions</span>
              </div>
              <p className="text-2xl font-bold">{metrics.conversions.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Rate: {formatPercentage(metrics.conversionRate)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {reportingData.length > 0 && (
        <Tabs defaultValue="chart" className="w-full">
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="chart">Charts</TabsTrigger>
              <TabsTrigger value="table">Data Table</TabsTrigger>
            </TabsList>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <TabsContent value="chart" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="impressions" fill="#3b82f6" name="Impressions" />
                    <Bar yAxisId="left" dataKey="clicks" fill="#10b981" name="Clicks" />
                    <Bar yAxisId="right" dataKey="cost" fill="#f59e0b" name="Cost ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Click-Through Rate Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => `${value.toFixed(2)}%`} />
                    <Line type="monotone" dataKey="ctr" stroke="#8b5cf6" strokeWidth={2} name="CTR %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="table">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Performance Data</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Impressions</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">CPC</TableHead>
                      <TableHead className="text-right">Conversions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportingData.map((item, index) => {
                      const ctr = item.impressions > 0 ? ((item.clicks || 0) / item.impressions) * 100 : 0;
                      const cpc = item.clicks > 0 ? (item.costInUsd || 0) / item.clicks : 0;
                      
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {item.campaignName || item.accountName || `Item ${index + 1}`}
                          </TableCell>
                          <TableCell className="text-right">{(item.impressions || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right">{(item.clicks || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right">{formatPercentage(ctr)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.costInUsd || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(cpc)}</TableCell>
                          <TableCell className="text-right">{(item.conversions || 0).toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};