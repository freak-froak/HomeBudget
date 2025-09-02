import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { DashboardWidget } from "@/components/DashboardWidget";
import { AIAssistant } from "@/components/AIAssistant";
import { WidgetCustomizer } from "@/components/WidgetCustomizer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { formatCurrency, formatDateTime, getProgressPercentage } from "@/lib/authUtils";
import { 
  Wallet, CreditCard, TrendingUp, PiggyBank, Download, 
  CalendarPlus, MoreHorizontal, Coffee, Fuel, ShoppingBag, 
  ArrowDownLeft, Utensils, Car, Zap, Home, Plane 
} from "lucide-react";

export default function Dashboard() {
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [chartPeriod, setChartPeriod] = useState("thisMonth");
  const [widgetVisibility, setWidgetVisibility] = useState({
    balance: true,
    expenses: true,
    income: true,
    savings: true
  });
  const [customizingWidget, setCustomizingWidget] = useState<string | null>(null);
  const [widgetCustomizations, setWidgetCustomizations] = useState<Record<string, any>>({});

  // Data fetching
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"]
  });

  const { data: categoryBreakdown } = useQuery({
    queryKey: ["/api/dashboard/category-breakdown"],
    enabled: !!dashboardStats
  });

  const { data: goals } = useQuery({
    queryKey: ["/api/goals"]
  });

  const { data: recentExpenses } = useQuery({
    queryKey: ["/api/expenses"],
    enabled: !!dashboardStats
  });

  const { data: spendingInsights } = useQuery({
    queryKey: ["/api/ai/spending-insights"],
    enabled: !!dashboardStats
  });

  const handleWidgetCustomization = (widgetName: string, customization: any) => {
    setWidgetCustomizations(prev => ({
      ...prev,
      [widgetName]: customization
    }));
  };

  const getCategoryIcon = (categoryName: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      "food": <Utensils className="w-4 h-4" />,
      "transportation": <Car className="w-4 h-4" />,
      "shopping": <ShoppingBag className="w-4 h-4" />,
      "utilities": <Zap className="w-4 h-4" />,
    };
    return iconMap[categoryName.toLowerCase()] || <Wallet className="w-4 h-4" />;
  };

  if (statsLoading) {
    return (
      <div className="p-4 lg:p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-8 animate-fade-in" data-testid="page-dashboard">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {widgetVisibility.balance && (
          <DashboardWidget
            title={t("dashboard.totalBalance")}
            value={formatCurrency(dashboardStats?.totalBalance || 0)}
            icon={<Wallet className="w-6 h-6 text-accent" />}
            trend="positive"
            change={{
              value: 5.2,
              label: "from last month"
            }}
            customization={widgetCustomizations.balance}
            onCustomize={() => setCustomizingWidget("balance")}
            onRemove={() => setWidgetVisibility(prev => ({ ...prev, balance: false }))}
          />
        )}

        {widgetVisibility.expenses && (
          <DashboardWidget
            title={t("dashboard.monthlyExpenses")}
            value={formatCurrency(dashboardStats?.thisMonthExpenses || 0)}
            icon={<CreditCard className="w-6 h-6 text-destructive" />}
            trend="negative"
            change={{
              value: dashboardStats?.expenseChange || 0,
              label: "from last month"
            }}
            customization={widgetCustomizations.expenses}
            onCustomize={() => setCustomizingWidget("expenses")}
            onRemove={() => setWidgetVisibility(prev => ({ ...prev, expenses: false }))}
          />
        )}

        {widgetVisibility.income && (
          <DashboardWidget
            title={t("dashboard.monthlyIncome")}
            value={formatCurrency(dashboardStats?.thisMonthIncome || 0)}
            icon={<TrendingUp className="w-6 h-6 text-primary" />}
            trend="positive"
            change={{
              value: dashboardStats?.incomeChange || 0,
              label: "from last month"
            }}
            customization={widgetCustomizations.income}
            onCustomize={() => setCustomizingWidget("income")}
            onRemove={() => setWidgetVisibility(prev => ({ ...prev, income: false }))}
          />
        )}

        {widgetVisibility.savings && (
          <DashboardWidget
            title={t("dashboard.savingsRate")}
            value={`${Math.round(dashboardStats?.savingsRate || 0)}%`}
            icon={<PiggyBank className="w-6 h-6 text-warning" />}
            trend={dashboardStats?.savingsRate > 20 ? "positive" : "neutral"}
            change={{
              value: 2.1,
              label: "Goal: 50%"
            }}
            customization={widgetCustomizations.savings}
            onCustomize={() => setCustomizingWidget("savings")}
            onRemove={() => setWidgetVisibility(prev => ({ ...prev, savings: false }))}
          />
        )}
      </div>

      {/* Charts and Calendar Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Breakdown Chart */}
        <Card className="lg:col-span-2 glass-card widget-hover border border-border" data-testid="card-spending-breakdown">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t("dashboard.spendingBreakdown")}</CardTitle>
              <div className="flex items-center space-x-2">
                <Select value={chartPeriod} onValueChange={setChartPeriod}>
                  <SelectTrigger className="w-32" data-testid="select-chart-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thisMonth">{t("dashboard.thisMonth")}</SelectItem>
                    <SelectItem value="lastMonth">{t("dashboard.lastMonth")}</SelectItem>
                    <SelectItem value="thisYear">{t("dashboard.thisYear")}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" data-testid="button-download-chart">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Chart Placeholder */}
              <div className="relative h-48 bg-gradient-to-br from-muted/30 to-muted/10 rounded-lg flex items-center justify-center">
                <div className="w-32 h-32 chart-container rounded-full relative">
                  <div className="absolute inset-4 bg-background rounded-full flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrency(dashboardStats?.thisMonthExpenses || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Category Legend */}
              <div className="space-y-3">
                {categoryBreakdown?.slice(0, 4).map((category: any, index: number) => (
                  <div key={index} className="flex items-center justify-between" data-testid={`category-item-${index}`}>
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                      <div className="flex items-center space-x-2">
                        {getCategoryIcon(category.category)}
                        <span className="text-sm text-foreground">{category.category}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(category.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(category.percentage)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Widget */}
        <Card className="glass-card widget-hover border border-border" data-testid="card-calendar">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Calendar</CardTitle>
              <Button variant="ghost" size="icon" data-testid="button-calendar-add">
                <CalendarPlus className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="w-full"
              data-testid="calendar-widget"
            />
            <div className="pt-4 border-t border-border mt-4">
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span>Income</span>
                <div className="w-2 h-2 bg-destructive rounded-full"></div>
                <span>Bills</span>
                <div className="w-2 h-2 bg-warning rounded-full"></div>
                <span>Goals</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals and Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Goals */}
        <Card className="glass-card widget-hover border border-border" data-testid="card-goals">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t("dashboard.financialGoals")}</CardTitle>
              <Button variant="ghost" className="text-accent hover:text-accent/80 text-sm font-medium">
                {t("dashboard.viewAll")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {goals && goals.length > 0 ? goals.slice(0, 3).map((goal: any) => (
                <div key={goal.id} className="p-4 bg-muted/30 rounded-lg" data-testid={`goal-item-${goal.id}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Home className="w-4 h-4 text-accent" />
                      <span className="font-medium text-foreground">{goal.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(Number(goal.currentAmount))} / {formatCurrency(Number(goal.targetAmount))}
                    </span>
                  </div>
                  <Progress 
                    value={getProgressPercentage(Number(goal.currentAmount), Number(goal.targetAmount))} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(getProgressPercentage(Number(goal.currentAmount), Number(goal.targetAmount)))}% complete • 
                    {formatCurrency(Number(goal.targetAmount) - Number(goal.currentAmount))} to go
                  </p>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No financial goals set yet.</p>
                  <Button variant="outline" className="mt-2" data-testid="button-create-first-goal">
                    Create Your First Goal
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="glass-card widget-hover border border-border" data-testid="card-transactions">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t("dashboard.recentTransactions")}</CardTitle>
              <Button variant="ghost" className="text-accent hover:text-accent/80 text-sm font-medium">
                {t("dashboard.viewAll")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentExpenses && recentExpenses.length > 0 ? recentExpenses.slice(0, 4).map((expense: any) => (
                <div 
                  key={expense.id} 
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors"
                  data-testid={`transaction-item-${expense.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      expense.type === "income" ? "bg-success/10" : "bg-accent/10"
                    }`}>
                      {expense.type === "income" ? (
                        <ArrowDownLeft className="w-5 h-5 text-success" />
                      ) : (
                        <Coffee className="w-5 h-5 text-accent" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{expense.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(expense.date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${
                      expense.type === "income" ? "text-success" : "text-destructive"
                    }`}>
                      {expense.type === "income" ? "+" : "-"}{formatCurrency(Number(expense.amount))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {expense.categoryId || "Uncategorized"}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No transactions yet.</p>
                  <Button variant="outline" className="mt-2" data-testid="button-add-first-expense">
                    Add Your First Expense
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Assistant Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AIAssistant />
        </div>
        
        {/* AI Insights Panel */}
        <Card className="glass-card border border-border" data-testid="card-ai-insights">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Smart Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {spendingInsights?.patterns?.slice(0, 3).map((pattern: string, index: number) => (
                <div 
                  key={index} 
                  className="p-3 bg-muted/30 rounded-lg"
                  data-testid={`insight-pattern-${index}`}
                >
                  <p className="text-sm text-foreground">{pattern}</p>
                </div>
              ))}
              
              {spendingInsights?.warnings?.map((warning: string, index: number) => (
                <div 
                  key={index} 
                  className="p-3 bg-warning/10 border border-warning/30 rounded-lg"
                  data-testid={`insight-warning-${index}`}
                >
                  <p className="text-sm text-warning-foreground">{warning}</p>
                </div>
              ))}

              {(!spendingInsights?.patterns || spendingInsights.patterns.length === 0) && (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">Add more expenses to get AI insights</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Widget Customizer Modal */}
      {customizingWidget && (
        <WidgetCustomizer
          isOpen={!!customizingWidget}
          onClose={() => setCustomizingWidget(null)}
          widgetName={customizingWidget}
          currentCustomization={widgetCustomizations[customizingWidget] || {
            borderColor: "#10B981",
            borderStyle: "solid",
            borderWidth: "medium",
            backgroundColor: "transparent",
            textColor: "inherit",
            opacity: 100,
            cornerRadius: 12,
            shadowDepth: 2,
            animationSpeed: 300
          }}
          onSave={(customization) => handleWidgetCustomization(customizingWidget, customization)}
        />
      )}
    </div>
  );
}
