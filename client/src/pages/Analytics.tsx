import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/authUtils";
import type { Expense, Category } from "@shared/schema";
import { 
  BarChart3, TrendingUp, TrendingDown, PieChart, Calendar,
  Download, Filter, DollarSign, CreditCard, Target, AlertTriangle
} from "lucide-react";

type PeriodFilter = "thisMonth" | "lastMonth" | "last3Months" | "last6Months" | "thisYear" | "lastYear";

export default function Analytics() {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<PeriodFilter>("thisMonth");
  const [categoryView, setCategoryView] = useState<"expenses" | "income">("expenses");

  // Data fetching
  const { data: dashboardStats } = useQuery({
    queryKey: ["/api/dashboard/stats"]
  });

  const { data: categoryBreakdown } = useQuery({
    queryKey: ["/api/dashboard/category-breakdown", period]
  });

  const { data: spendingTrends } = useQuery({
    queryKey: ["/api/dashboard/spending-trends"],
    queryFn: async () => {
      const months = period === "last3Months" ? 3 : period === "last6Months" ? 6 : 12;
      const response = await fetch(`/api/dashboard/spending-trends?months=${months}`, { 
        credentials: "include" 
      });
      return response.json();
    }
  });

  const { data: expenses } = useQuery({
    queryKey: ["/api/expenses"]
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"]
  });

  const { data: spendingInsights } = useQuery({
    queryKey: ["/api/ai/spending-insights"]
  });

  // Calculate analytics data
  const calculateFixedVsVariable = () => {
    if (!expenses) return { fixed: 0, variable: 0 };
    
    const fixed = expenses
      .filter((e: Expense) => e.type === "expense" && e.isFixed)
      .reduce((sum: number, e: Expense) => sum + Number(e.amount), 0);
    
    const variable = expenses
      .filter((e: Expense) => e.type === "expense" && !e.isFixed)
      .reduce((sum: number, e: Expense) => sum + Number(e.amount), 0);
    
    return { fixed, variable };
  };

  const calculateTopCategories = () => {
    if (!categoryBreakdown) return [];
    
    return [...categoryBreakdown]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  };

  const calculateSpendingByDay = () => {
    if (!expenses) return {};
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const spendingByDay: Record<string, number> = {};
    
    days.forEach(day => { spendingByDay[day] = 0; });
    
    expenses
      .filter((e: Expense) => e.type === "expense")
      .forEach((expense: Expense) => {
        const dayName = days[new Date(expense.date).getDay()];
        spendingByDay[dayName] += Number(expense.amount);
      });
    
    return spendingByDay;
  };

  const calculateMonthlyGrowth = () => {
    if (!spendingTrends || spendingTrends.length < 2) return { expenses: 0, income: 0 };
    
    const current = spendingTrends[spendingTrends.length - 1];
    const previous = spendingTrends[spendingTrends.length - 2];
    
    const expenseGrowth = previous.totalExpenses > 0 
      ? ((current.totalExpenses - previous.totalExpenses) / previous.totalExpenses) * 100 
      : 0;
    
    const incomeGrowth = previous.totalIncome > 0 
      ? ((current.totalIncome - previous.totalIncome) / previous.totalIncome) * 100 
      : 0;
    
    return { expenses: expenseGrowth, income: incomeGrowth };
  };

  const { fixed, variable } = calculateFixedVsVariable();
  const topCategories = calculateTopCategories();
  const spendingByDay = calculateSpendingByDay();
  const monthlyGrowth = calculateMonthlyGrowth();
  const totalFixedVariable = fixed + variable;

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in" data-testid="page-analytics">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("navigation.analytics")}</h1>
          <p className="text-muted-foreground">Deep insights into your financial patterns</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={period} onValueChange={(value) => setPeriod(value as PeriodFilter)}>
            <SelectTrigger className="w-48" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
              <SelectItem value="last3Months">Last 3 Months</SelectItem>
              <SelectItem value="last6Months">Last 6 Months</SelectItem>
              <SelectItem value="thisYear">This Year</SelectItem>
              <SelectItem value="lastYear">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" data-testid="button-export-analytics">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Daily Spending</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency((dashboardStats?.thisMonthExpenses || 0) / 30)}
                </p>
              </div>
              <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expense Growth</p>
                <p className={`text-2xl font-bold ${monthlyGrowth.expenses >= 0 ? "text-destructive" : "text-success"}`}>
                  {monthlyGrowth.expenses >= 0 ? "+" : ""}{monthlyGrowth.expenses.toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                {monthlyGrowth.expenses >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-warning" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-success" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Income Growth</p>
                <p className={`text-2xl font-bold ${monthlyGrowth.income >= 0 ? "text-success" : "text-destructive"}`}>
                  {monthlyGrowth.income >= 0 ? "+" : ""}{monthlyGrowth.income.toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                {monthlyGrowth.income >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-success" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-destructive" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Savings Rate</p>
                <p className="text-2xl font-bold text-accent">
                  {Math.round(dashboardStats?.savingsRate || 0)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Trends Chart */}
        <Card className="glass-card" data-testid="card-spending-trends">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Spending Trends</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Simplified trend visualization */}
              <div className="h-48 bg-gradient-to-br from-muted/30 to-muted/10 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Monthly Trend</p>
                  {spendingTrends && spendingTrends.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(spendingTrends[spendingTrends.length - 1]?.totalExpenses || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Current month expenses
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Trend data list */}
              {spendingTrends && (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {spendingTrends.slice(-6).map((trend: any, index: number) => (
                    <div key={trend.month} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{trend.month}</span>
                      <div className="flex items-center space-x-4">
                        <span className="text-destructive">{formatCurrency(trend.totalExpenses)}</span>
                        <span className="text-success">{formatCurrency(trend.totalIncome)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="glass-card" data-testid="card-category-breakdown">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <PieChart className="w-5 h-5" />
                <span>Category Breakdown</span>
              </CardTitle>
              <Select value={categoryView} onValueChange={(value) => setCategoryView(value as typeof categoryView)}>
                <SelectTrigger className="w-32" data-testid="select-category-view">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expenses">Expenses</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCategories.length > 0 ? (
                topCategories.map((category: any, index: number) => (
                  <div key={index} className="space-y-2" data-testid={`category-breakdown-${index}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-sm font-medium">{category.category}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(category.amount)}</p>
                        <p className="text-xs text-muted-foreground">{Math.round(category.percentage)}%</p>
                      </div>
                    </div>
                    <Progress value={category.percentage} className="h-2" />
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No category data available for this period
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Fixed vs Variable Expenses */}
        <Card className="glass-card" data-testid="card-fixed-variable">
          <CardHeader>
            <CardTitle>Fixed vs Variable Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Fixed Expenses</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(fixed)}</p>
                  <p className="text-xs text-muted-foreground">
                    {totalFixedVariable > 0 ? Math.round((fixed / totalFixedVariable) * 100) : 0}%
                  </p>
                </div>
                <div className="text-center p-4 bg-warning/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Variable Expenses</p>
                  <p className="text-2xl font-bold text-warning">{formatCurrency(variable)}</p>
                  <p className="text-xs text-muted-foreground">
                    {totalFixedVariable > 0 ? Math.round((variable / totalFixedVariable) * 100) : 0}%
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Fixed Expenses</span>
                  <span>{formatCurrency(fixed)}</span>
                </div>
                <Progress 
                  value={totalFixedVariable > 0 ? (fixed / totalFixedVariable) * 100 : 0} 
                  className="h-3" 
                />
                <div className="flex justify-between text-sm">
                  <span>Variable Expenses</span>
                  <span>{formatCurrency(variable)}</span>
                </div>
                <Progress 
                  value={totalFixedVariable > 0 ? (variable / totalFixedVariable) * 100 : 0} 
                  className="h-3" 
                />
              </div>
              
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Tip:</strong> Aim to keep fixed expenses below 50% of your income for better financial flexibility.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Spending by Day of Week */}
        <Card className="glass-card" data-testid="card-spending-by-day">
          <CardHeader>
            <CardTitle>Spending by Day of Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(spendingByDay).map(([day, amount]) => {
                const maxAmount = Math.max(...Object.values(spendingByDay));
                const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
                
                return (
                  <div key={day} className="space-y-1" data-testid={`day-spending-${day}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{day}</span>
                      <span className="text-sm">{formatCurrency(amount)}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {spendingInsights && (
        <Card className="glass-card" data-testid="card-ai-insights">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5" />
              <span>AI Financial Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Patterns */}
              {spendingInsights.patterns && spendingInsights.patterns.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Spending Patterns</h4>
                  <div className="space-y-2">
                    {spendingInsights.patterns.slice(0, 3).map((pattern: string, index: number) => (
                      <div key={index} className="p-3 bg-accent/10 rounded-lg">
                        <p className="text-sm text-foreground">{pattern}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {spendingInsights.warnings && spendingInsights.warnings.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Warnings</h4>
                  <div className="space-y-2">
                    {spendingInsights.warnings.slice(0, 3).map((warning: string, index: number) => (
                      <div key={index} className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                        <p className="text-sm text-destructive-foreground">{warning}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {spendingInsights.suggestions && spendingInsights.suggestions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Suggestions</h4>
                  <div className="space-y-2">
                    {spendingInsights.suggestions.slice(0, 3).map((suggestion: string, index: number) => (
                      <div key={index} className="p-3 bg-success/10 rounded-lg">
                        <p className="text-sm text-success-foreground">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Savings Potential */}
            {spendingInsights.savingsPotential && spendingInsights.savingsPotential > 0 && (
              <div className="mt-6 p-4 bg-gradient-to-r from-success/10 to-accent/10 border border-success/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground">Potential Monthly Savings</h4>
                    <p className="text-sm text-muted-foreground">Based on AI analysis of your spending patterns</p>
                  </div>
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency(spendingInsights.savingsPotential)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
