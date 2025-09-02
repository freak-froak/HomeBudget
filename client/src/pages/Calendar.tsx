import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { formatCurrency, formatDate } from "@/lib/authUtils";
import type { Expense, Goal } from "@shared/schema";
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus,
  TrendingUp, TrendingDown, Target, CreditCard, DollarSign,
  Filter, Download, Eye
} from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isSameDay, parseISO } from "date-fns";

type ViewMode = "month" | "week" | "day";
type CalendarFilter = "all" | "expenses" | "income" | "goals" | "bills";

export default function Calendar() {
  const { t } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [filter, setFilter] = useState<CalendarFilter>("all");

  // Data fetching
  const { data: expenses } = useQuery({
    queryKey: ["/api/expenses", {
      startDate: startOfMonth(currentDate).toISOString(),
      endDate: endOfMonth(currentDate).toISOString()
    }],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startOfMonth(currentDate).toISOString(),
        endDate: endOfMonth(currentDate).toISOString()
      });
      const response = await fetch(`/api/expenses?${params}`, { credentials: "include" });
      return response.json();
    }
  });

  const { data: goals } = useQuery({
    queryKey: ["/api/goals"]
  });

  // Navigation handlers
  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(prev => direction === "prev" ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  // Get expenses for a specific date
  const getExpensesForDate = (date: Date) => {
    return expenses?.filter((expense: Expense) => 
      isSameDay(parseISO(expense.date), date)
    ) || [];
  };

  // Get goals with deadlines for a specific date
  const getGoalsForDate = (date: Date) => {
    return goals?.filter((goal: Goal) => 
      goal.deadline && isSameDay(parseISO(goal.deadline), date)
    ) || [];
  };

  // Calculate daily totals
  const getDayTotals = (date: Date) => {
    const dayExpenses = getExpensesForDate(date);
    const totalExpenses = dayExpenses
      .filter((e: Expense) => e.type === "expense")
      .reduce((sum: number, e: Expense) => sum + Number(e.amount), 0);
    const totalIncome = dayExpenses
      .filter((e: Expense) => e.type === "income")
      .reduce((sum: number, e: Expense) => sum + Number(e.amount), 0);
    
    return { totalExpenses, totalIncome, count: dayExpenses.length };
  };

  // Calendar month view with expense indicators
  const renderCalendarDay = (date: Date) => {
    const dayTotals = getDayTotals(date);
    const dayGoals = getGoalsForDate(date);
    const hasActivity = dayTotals.count > 0 || dayGoals.length > 0;

    if (!hasActivity) return null;

    return (
      <div className="absolute bottom-0 left-0 right-0 p-1">
        <div className="space-y-0.5">
          {dayTotals.totalExpenses > 0 && (
            <div className="w-full h-1 bg-destructive rounded-full opacity-60" />
          )}
          {dayTotals.totalIncome > 0 && (
            <div className="w-full h-1 bg-success rounded-full opacity-60" />
          )}
          {dayGoals.length > 0 && (
            <div className="w-full h-1 bg-warning rounded-full opacity-60" />
          )}
        </div>
      </div>
    );
  };

  // Get selected date details
  const selectedDateExpenses = selectedDate ? getExpensesForDate(selectedDate) : [];
  const selectedDateGoals = selectedDate ? getGoalsForDate(selectedDate) : [];
  const selectedDateTotals = selectedDate ? getDayTotals(selectedDate) : { totalExpenses: 0, totalIncome: 0, count: 0 };

  // Filter data based on selected filter
  const getFilteredData = () => {
    let filteredExpenses = selectedDateExpenses;
    
    switch (filter) {
      case "expenses":
        filteredExpenses = selectedDateExpenses.filter((e: Expense) => e.type === "expense");
        break;
      case "income":
        filteredExpenses = selectedDateExpenses.filter((e: Expense) => e.type === "income");
        break;
      case "bills":
        filteredExpenses = selectedDateExpenses.filter((e: Expense) => e.isFixed);
        break;
    }

    return {
      expenses: filteredExpenses,
      goals: filter === "goals" || filter === "all" ? selectedDateGoals : []
    };
  };

  const filteredData = getFilteredData();

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in" data-testid="page-calendar">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("navigation.calendar")}</h1>
          <p className="text-muted-foreground">View your financial activities over time</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
            <SelectTrigger className="w-32" data-testid="select-view-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="day">Day</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" data-testid="button-export-calendar">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <Card className="lg:col-span-2 glass-card" data-testid="card-calendar-view">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth("prev")}
                  data-testid="button-prev-month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <CardTitle className="text-xl">
                  {format(currentDate, "MMMM yyyy")}
                </CardTitle>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth("next")}
                  data-testid="button-next-month"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => setCurrentDate(new Date())}
                data-testid="button-today"
              >
                Today
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Calendar Component */}
              <div className="relative">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={currentDate}
                  onMonthChange={setCurrentDate}
                  className="w-full"
                  components={{
                    Day: ({ date, ...props }) => (
                      <div className="relative w-full h-12 p-1" {...props}>
                        <div className="text-center">{date.getDate()}</div>
                        {renderCalendarDay(date)}
                      </div>
                    )
                  }}
                  data-testid="calendar-main"
                />
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-1 bg-destructive rounded-full" />
                  <span>Expenses</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-1 bg-success rounded-full" />
                  <span>Income</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-1 bg-warning rounded-full" />
                  <span>Goal Deadlines</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Day Details */}
        <div className="space-y-6">
          {/* Selected Date Summary */}
          <Card className="glass-card" data-testid="card-date-summary">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CalendarIcon className="w-5 h-5" />
                <span>{selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Select a date"}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDate ? (
                <div className="space-y-4">
                  {/* Daily Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-destructive/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Expenses</p>
                      <p className="text-lg font-bold text-destructive">
                        {formatCurrency(selectedDateTotals.totalExpenses)}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-success/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Income</p>
                      <p className="text-lg font-bold text-success">
                        {formatCurrency(selectedDateTotals.totalIncome)}
                      </p>
                    </div>
                  </div>

                  {/* Net Balance */}
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Net Balance</p>
                    <p className={`text-xl font-bold ${
                      selectedDateTotals.totalIncome - selectedDateTotals.totalExpenses >= 0 
                        ? "text-success" : "text-destructive"
                    }`}>
                      {formatCurrency(selectedDateTotals.totalIncome - selectedDateTotals.totalExpenses)}
                    </p>
                  </div>

                  {/* Filter Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "all", label: "All", count: selectedDateExpenses.length + selectedDateGoals.length },
                      { value: "expenses", label: "Expenses", count: selectedDateExpenses.filter((e: Expense) => e.type === "expense").length },
                      { value: "income", label: "Income", count: selectedDateExpenses.filter((e: Expense) => e.type === "income").length },
                      { value: "goals", label: "Goals", count: selectedDateGoals.length },
                      { value: "bills", label: "Bills", count: selectedDateExpenses.filter((e: Expense) => e.isFixed).length }
                    ].map((filterOption) => (
                      <Button
                        key={filterOption.value}
                        variant={filter === filterOption.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter(filterOption.value as CalendarFilter)}
                        className="text-xs"
                        data-testid={`button-filter-${filterOption.value}`}
                      >
                        {filterOption.label} ({filterOption.count})
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Select a date to view details
                </p>
              )}
            </CardContent>
          </Card>

          {/* Transactions & Goals List */}
          {selectedDate && (
            <Card className="glass-card" data-testid="card-date-details">
              <CardHeader>
                <CardTitle className="text-lg">
                  {format(selectedDate, "MMMM d")} Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {/* Expenses */}
                  {filteredData.expenses.map((expense: Expense) => (
                    <div 
                      key={expense.id} 
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      data-testid={`transaction-${expense.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          expense.type === "income" ? "bg-success" : "bg-destructive"
                        }`} />
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            {expense.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {expense.isFixed && (
                              <Badge variant="outline" className="text-xs mr-1">Fixed</Badge>
                            )}
                            {new Date(expense.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium text-sm ${
                          expense.type === "income" ? "text-success" : "text-destructive"
                        }`}>
                          {expense.type === "income" ? "+" : "-"}{formatCurrency(Number(expense.amount))}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Goals */}
                  {filteredData.goals.map((goal: Goal) => (
                    <div 
                      key={goal.id} 
                      className="flex items-center justify-between p-3 bg-warning/10 border border-warning/30 rounded-lg"
                      data-testid={`goal-deadline-${goal.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        <Target className="w-4 h-4 text-warning" />
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            {goal.name} (Deadline)
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {Math.round((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100)}% complete
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm text-warning">
                          {formatCurrency(Number(goal.targetAmount))}
                        </p>
                        <Badge variant={goal.isCompleted ? "default" : "secondary"} className="text-xs">
                          {goal.isCompleted ? "Completed" : "In Progress"}
                        </Badge>
                      </div>
                    </div>
                  ))}

                  {/* Empty State */}
                  {filteredData.expenses.length === 0 && filteredData.goals.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {filter === "all" 
                          ? "No financial activity on this date"
                          : `No ${filter} on this date`
                        }
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
