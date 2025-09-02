import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertBudgetSchema, type InsertBudget, type Budget, type Category } from "@shared/schema";
import { formatCurrency } from "@/lib/authUtils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Plus, Calculator, AlertTriangle, CheckCircle, Edit, Trash2,
  Calendar as CalendarIcon, TrendingUp, TrendingDown, Target,
  DollarSign, CreditCard, PiggyBank
} from "lucide-react";
import { format } from "date-fns";

export default function Budget() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  // Data fetching
  const { data: budgets, isLoading } = useQuery({
    queryKey: ["/api/budgets"]
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"]
  });

  const { data: expenses } = useQuery({
    queryKey: ["/api/expenses"]
  });

  const { data: dashboardStats } = useQuery({
    queryKey: ["/api/dashboard/stats"]
  });

  // Form handling
  const form = useForm<InsertBudget>({
    resolver: zodResolver(insertBudgetSchema),
    defaultValues: {
      name: "",
      amount: "0",
      period: "monthly",
      startDate: new Date(),
      isActive: true,
      alertThreshold: "0.80"
    }
  });

  // Mutations
  const createBudgetMutation = useMutation({
    mutationFn: async (data: InsertBudget) => {
      const response = await apiRequest("POST", "/api/budgets", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      toast({ title: "Budget created successfully" });
      setShowBudgetModal(false);
      form.reset();
    }
  });

  const updateBudgetMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Budget> }) => {
      const response = await apiRequest("PATCH", `/api/budgets/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      toast({ title: "Budget updated successfully" });
      setShowBudgetModal(false);
      setEditingBudget(null);
      form.reset();
    }
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/budgets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      toast({ title: "Budget deleted successfully" });
    }
  });

  // Calculate budget progress
  const calculateBudgetProgress = (budget: Budget) => {
    if (!expenses) return { spent: 0, percentage: 0, remaining: 0, status: "on-track" as const };

    const now = new Date();
    const startDate = new Date(budget.startDate);
    let endDate: Date;

    switch (budget.period) {
      case "weekly":
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);
        break;
      case "yearly":
        endDate = new Date(startDate);
        endDate.setFullYear(startDate.getFullYear() + 1);
        break;
      case "monthly":
      default:
        endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + 1);
        break;
    }

    const categoryExpenses = expenses.filter((expense: any) => {
      const expenseDate = new Date(expense.date);
      return (
        expense.type === "expense" &&
        expenseDate >= startDate &&
        expenseDate <= endDate &&
        (budget.categoryId ? expense.categoryId === budget.categoryId : true)
      );
    });

    const spent = categoryExpenses.reduce((sum: number, expense: any) => sum + Number(expense.amount), 0);
    const budgetAmount = Number(budget.amount);
    const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
    const remaining = budgetAmount - spent;
    const alertThreshold = Number(budget.alertThreshold) * 100;

    let status: "on-track" | "warning" | "over-budget" = "on-track";
    if (percentage >= 100) status = "over-budget";
    else if (percentage >= alertThreshold) status = "warning";

    return { spent, percentage, remaining, status };
  };

  // Event handlers
  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    form.reset({
      ...budget,
      amount: budget.amount.toString(),
      alertThreshold: budget.alertThreshold?.toString() || "0.80"
    });
    setShowBudgetModal(true);
  };

  const handleSubmit = (data: InsertBudget) => {
    if (editingBudget) {
      updateBudgetMutation.mutate({
        id: editingBudget.id,
        updates: {
          ...data,
          amount: data.amount.toString(),
          alertThreshold: data.alertThreshold?.toString()
        }
      });
    } else {
      createBudgetMutation.mutate({
        ...data,
        amount: data.amount.toString(),
        alertThreshold: data.alertThreshold?.toString()
      });
    }
  };

  // Calculate overall budget statistics
  const totalBudgeted = budgets?.reduce((sum: number, budget: Budget) => sum + Number(budget.amount), 0) || 0;
  const totalSpent = budgets?.reduce((sum: number, budget: Budget) => {
    const progress = calculateBudgetProgress(budget);
    return sum + progress.spent;
  }, 0) || 0;
  const totalRemaining = totalBudgeted - totalSpent;
  const overallProgress = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  const activeBudgets = budgets?.filter((b: Budget) => b.isActive).length || 0;
  const warningBudgets = budgets?.filter((b: Budget) => {
    const progress = calculateBudgetProgress(b);
    return progress.status === "warning" || progress.status === "over-budget";
  }).length || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "warning": return "text-warning";
      case "over-budget": return "text-destructive";
      default: return "text-success";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "warning": return <Badge variant="default" className="bg-warning text-warning-foreground">Warning</Badge>;
      case "over-budget": return <Badge variant="destructive">Over Budget</Badge>;
      default: return <Badge variant="default" className="bg-success text-success-foreground">On Track</Badge>;
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in" data-testid="page-budget">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("navigation.budget")}</h1>
          <p className="text-muted-foreground">Plan and track your spending limits</p>
        </div>
        <Button 
          onClick={() => {
            setEditingBudget(null);
            form.reset();
            setShowBudgetModal(true);
          }}
          data-testid="button-add-budget"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Budget
        </Button>
      </div>

      {/* Budget Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Budgeted</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalBudgeted)}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Calculator className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(totalSpent)}</p>
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
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className={`text-2xl font-bold ${totalRemaining >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatCurrency(totalRemaining)}
                </p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                <PiggyBank className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Budgets</p>
                <p className="text-2xl font-bold text-accent">{activeBudgets}</p>
                {warningBudgets > 0 && (
                  <p className="text-xs text-warning">{warningBudgets} need attention</p>
                )}
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Overall Budget Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Progress</span>
              <span className="text-sm font-medium">{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-4" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Spent: {formatCurrency(totalSpent)}</span>
              <span className="font-medium">Budget: {formatCurrency(totalBudgeted)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Your Budgets</h2>
        
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : budgets && budgets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map((budget: Budget) => {
              const progress = calculateBudgetProgress(budget);
              const category = categories?.find((c: Category) => c.id === budget.categoryId);

              return (
                <Card 
                  key={budget.id} 
                  className={`glass-card widget-hover border transition-all ${
                    progress.status === "over-budget" ? "border-destructive/30 bg-destructive/5" :
                    progress.status === "warning" ? "border-warning/30 bg-warning/5" : "border-border"
                  }`}
                  data-testid={`card-budget-${budget.id}`}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-2xl">
                          {category?.icon || "💰"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{budget.name}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {budget.period}
                            </Badge>
                            {getStatusBadge(progress.status)}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(budget)}
                          data-testid={`button-edit-budget-${budget.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteBudgetMutation.mutate(budget.id)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-delete-budget-${budget.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progress</span>
                        <span className={`font-medium ${getStatusColor(progress.status)}`}>
                          {Math.round(progress.percentage)}%
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(progress.percentage, 100)} 
                        className="h-3" 
                      />
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-muted-foreground">
                          {formatCurrency(progress.spent)} spent
                        </span>
                        <span className="font-medium">
                          {formatCurrency(Number(budget.amount))} budget
                        </span>
                      </div>
                    </div>

                    {/* Remaining Amount */}
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm text-muted-foreground">Remaining</span>
                      <span className={`font-medium ${
                        progress.remaining >= 0 ? "text-success" : "text-destructive"
                      }`}>
                        {formatCurrency(progress.remaining)}
                      </span>
                    </div>

                    {/* Period Info */}
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <CalendarIcon className="w-4 h-4" />
                      <span>Started {format(new Date(budget.startDate), "MMM d, yyyy")}</span>
                    </div>

                    {/* Alert Threshold Warning */}
                    {progress.status !== "on-track" && (
                      <div className={`p-2 rounded-lg border text-xs ${
                        progress.status === "over-budget" 
                          ? "bg-destructive/10 border-destructive/30 text-destructive" 
                          : "bg-warning/10 border-warning/30 text-warning"
                      }`}>
                        <div className="flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>
                            {progress.status === "over-budget" 
                              ? "Budget exceeded!" 
                              : `${Math.round(Number(budget.alertThreshold) * 100)}% threshold reached`
                            }
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="glass-card">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calculator className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No budgets yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first budget to start tracking your spending limits and stay on top of your finances.
              </p>
              <Button onClick={() => setShowBudgetModal(true)} data-testid="button-add-first-budget">
                <Plus className="w-4 h-4 mr-2" />
                Create your first budget
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Budget Modal */}
      <Dialog open={showBudgetModal} onOpenChange={setShowBudgetModal}>
        <DialogContent className="sm:max-w-lg" data-testid="modal-budget">
          <DialogHeader>
            <DialogTitle>
              {editingBudget ? "Edit Budget" : "Create New Budget"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div>
              <Label>Budget Name</Label>
              <Input
                placeholder="e.g., Groceries, Entertainment, Transportation"
                {...form.register("name")}
                data-testid="input-budget-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Budget Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register("amount")}
                  data-testid="input-budget-amount"
                />
              </div>
              <div>
                <Label>Period</Label>
                <Select 
                  value={form.watch("period")} 
                  onValueChange={(value) => form.setValue("period", value as "weekly" | "monthly" | "yearly")}
                >
                  <SelectTrigger data-testid="select-budget-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category (Optional)</Label>
                <Select 
                  value={form.watch("categoryId") || ""} 
                  onValueChange={(value) => form.setValue("categoryId", value || undefined)}
                >
                  <SelectTrigger data-testid="select-budget-category">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All categories</SelectItem>
                    {categories?.filter((cat: Category) => cat.type === "expense").map((category: Category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center space-x-2">
                          <span>{category.icon}</span>
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Alert Threshold (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  placeholder="0.80"
                  {...form.register("alertThreshold")}
                  data-testid="input-alert-threshold"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Receive alerts when spending reaches this percentage
                </p>
              </div>
            </div>

            <div>
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    data-testid="button-start-date-picker"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch("startDate") ? format(new Date(form.watch("startDate")), "PPP") : "Pick a start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={form.watch("startDate") ? new Date(form.watch("startDate")) : undefined}
                    onSelect={(date) => form.setValue("startDate", date || new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowBudgetModal(false)}
                data-testid="button-cancel-budget"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createBudgetMutation.isPending || updateBudgetMutation.isPending}
                data-testid="button-save-budget"
              >
                {createBudgetMutation.isPending || updateBudgetMutation.isPending 
                  ? "Saving..." 
                  : editingBudget ? "Update Budget" : "Create Budget"
                }
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
