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
import { insertGoalSchema, type InsertGoal, type Goal, type Category } from "@shared/schema";
import { formatCurrency, formatDate, getProgressPercentage } from "@/lib/authUtils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Plus, Target, TrendingUp, Calendar as CalendarIcon, Edit, 
  Trash2, CheckCircle, AlertCircle, Clock, Trophy, Star,
  Home, Car, Plane, GraduationCap, Heart, Briefcase
} from "lucide-react";
import { format } from "date-fns";

const GOAL_ICONS = [
  { icon: "🏠", label: "Home", value: "home" },
  { icon: "🚗", label: "Car", value: "car" },
  { icon: "✈️", label: "Travel", value: "travel" },
  { icon: "🎓", label: "Education", value: "education" },
  { icon: "💍", label: "Wedding", value: "wedding" },
  { icon: "👶", label: "Baby", value: "baby" },
  { icon: "🏥", label: "Emergency", value: "emergency" },
  { icon: "💼", label: "Business", value: "business" },
  { icon: "🎯", label: "General", value: "general" },
  { icon: "💰", label: "Savings", value: "savings" }
];

export default function Goals() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [selectedIcon, setSelectedIcon] = useState("🎯");

  // Data fetching
  const { data: goals, isLoading } = useQuery({
    queryKey: ["/api/goals"]
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"]
  });

  // Form handling
  const form = useForm<InsertGoal>({
    resolver: zodResolver(insertGoalSchema),
    defaultValues: {
      name: "",
      targetAmount: "0",
      currentAmount: "0",
      priority: "medium",
      deadline: undefined
    }
  });

  // Mutations
  const createGoalMutation = useMutation({
    mutationFn: async (data: InsertGoal) => {
      const response = await apiRequest("POST", "/api/goals", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({ title: "Goal created successfully" });
      setShowGoalModal(false);
      form.reset();
    }
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Goal> }) => {
      const response = await apiRequest("PATCH", `/api/goals/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({ title: "Goal updated successfully" });
      setShowGoalModal(false);
      setEditingGoal(null);
      form.reset();
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({ title: "Goal deleted successfully" });
    }
  });

  // Event handlers
  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    form.reset({
      ...goal,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString()
    });
    setShowGoalModal(true);
  };

  const handleSubmit = (data: InsertGoal) => {
    if (editingGoal) {
      updateGoalMutation.mutate({
        id: editingGoal.id,
        updates: {
          ...data,
          targetAmount: data.targetAmount.toString(),
          currentAmount: data.currentAmount.toString()
        }
      });
    } else {
      createGoalMutation.mutate({
        ...data,
        targetAmount: data.targetAmount.toString(),
        currentAmount: data.currentAmount.toString()
      });
    }
  };

  const handleAddProgress = (goal: Goal, amount: number) => {
    const newAmount = Number(goal.currentAmount) + amount;
    const isCompleted = newAmount >= Number(goal.targetAmount);
    
    updateGoalMutation.mutate({
      id: goal.id,
      updates: {
        currentAmount: newAmount.toString(),
        isCompleted
      }
    });
  };

  // Filter goals
  const filteredGoals = goals?.filter((goal: Goal) => {
    switch (filter) {
      case "active":
        return !goal.isCompleted;
      case "completed":
        return goal.isCompleted;
      default:
        return true;
    }
  }) || [];

  // Calculate statistics
  const totalGoals = goals?.length || 0;
  const completedGoals = goals?.filter((g: Goal) => g.isCompleted).length || 0;
  const activeGoals = goals?.filter((g: Goal) => !g.isCompleted).length || 0;
  const totalTargetAmount = goals?.reduce((sum: number, g: Goal) => sum + Number(g.targetAmount), 0) || 0;
  const totalCurrentAmount = goals?.reduce((sum: number, g: Goal) => sum + Number(g.currentAmount), 0) || 0;
  const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;

  const getGoalIcon = (goalName: string) => {
    const found = GOAL_ICONS.find(icon => 
      goalName.toLowerCase().includes(icon.value) || 
      goalName.toLowerCase().includes(icon.label.toLowerCase())
    );
    return found?.icon || "🎯";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-destructive";
      case "medium": return "text-warning";
      case "low": return "text-success";
      default: return "text-muted-foreground";
    }
  };

  const getDaysUntilDeadline = (deadline?: string) => {
    if (!deadline) return null;
    const days = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in" data-testid="page-goals">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("navigation.goals")}</h1>
          <p className="text-muted-foreground">Set and track your financial goals</p>
        </div>
        <Button 
          onClick={() => {
            setEditingGoal(null);
            form.reset();
            setShowGoalModal(true);
          }}
          data-testid="button-add-goal"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Goal
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Goals</p>
                <p className="text-2xl font-bold text-foreground">{totalGoals}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Goals</p>
                <p className="text-2xl font-bold text-warning">{activeGoals}</p>
              </div>
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-success">{completedGoals}</p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Progress</p>
                <p className="text-2xl font-bold text-accent">{Math.round(overallProgress)}%</p>
                <Progress value={overallProgress} className="h-2 mt-2" />
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        {[
          { value: "all", label: "All Goals" },
          { value: "active", label: "Active" },
          { value: "completed", label: "Completed" }
        ].map((tab) => (
          <Button
            key={tab.value}
            variant={filter === tab.value ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter(tab.value as typeof filter)}
            data-testid={`button-filter-${tab.value}`}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-muted/30 rounded-lg animate-pulse" />
          ))
        ) : filteredGoals.length > 0 ? (
          filteredGoals.map((goal: Goal) => {
            const progress = getProgressPercentage(Number(goal.currentAmount), Number(goal.targetAmount));
            const daysUntilDeadline = getDaysUntilDeadline(goal.deadline);
            const isOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0;
            const isNearDeadline = daysUntilDeadline !== null && daysUntilDeadline <= 30 && daysUntilDeadline > 0;

            return (
              <Card 
                key={goal.id} 
                className={`glass-card widget-hover border transition-all ${
                  goal.isCompleted ? "border-success/30 bg-success/5" : 
                  isOverdue ? "border-destructive/30 bg-destructive/5" :
                  isNearDeadline ? "border-warning/30 bg-warning/5" : "border-border"
                }`}
                data-testid={`card-goal-${goal.id}`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center text-2xl">
                        {getGoalIcon(goal.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{goal.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge 
                            variant={goal.priority === "high" ? "destructive" : goal.priority === "medium" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {goal.priority} priority
                          </Badge>
                          {goal.isCompleted && (
                            <Badge variant="default" className="text-xs bg-success text-success-foreground">
                              <Trophy className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(goal)}
                        data-testid={`button-edit-goal-${goal.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteGoalMutation.mutate(goal.id)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-delete-goal-${goal.id}`}
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
                      <span className="font-medium">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-muted-foreground">
                        {formatCurrency(Number(goal.currentAmount))}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(Number(goal.targetAmount))}
                      </span>
                    </div>
                  </div>

                  {/* Deadline */}
                  {goal.deadline && (
                    <div className="flex items-center space-x-2 text-sm">
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Deadline:</span>
                      <span className={`font-medium ${
                        isOverdue ? "text-destructive" : 
                        isNearDeadline ? "text-warning" : "text-foreground"
                      }`}>
                        {formatDate(goal.deadline)}
                      </span>
                      {daysUntilDeadline !== null && (
                        <Badge variant={isOverdue ? "destructive" : isNearDeadline ? "default" : "secondary"} className="text-xs">
                          {isOverdue ? `${Math.abs(daysUntilDeadline)} days overdue` : 
                           daysUntilDeadline === 0 ? "Due today" :
                           `${daysUntilDeadline} days left`}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Quick Actions */}
                  {!goal.isCompleted && (
                    <div className="flex space-x-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleAddProgress(goal, 50)}
                        data-testid={`button-add-50-${goal.id}`}
                      >
                        + $50
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleAddProgress(goal, 100)}
                        data-testid={`button-add-100-${goal.id}`}
                      >
                        + $100
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        onClick={() => {
                          const remaining = Number(goal.targetAmount) - Number(goal.currentAmount);
                          handleAddProgress(goal, remaining);
                        }}
                        data-testid={`button-complete-${goal.id}`}
                      >
                        Complete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full">
            <Card className="glass-card">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {filter === "all" ? "No goals yet" : `No ${filter} goals`}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {filter === "all" 
                    ? "Start achieving your financial dreams by setting your first goal."
                    : `You don't have any ${filter} goals at the moment.`
                  }
                </p>
                {filter === "all" && (
                  <Button onClick={() => setShowGoalModal(true)} data-testid="button-add-first-goal">
                    <Plus className="w-4 h-4 mr-2" />
                    Set your first goal
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Goal Modal */}
      <Dialog open={showGoalModal} onOpenChange={setShowGoalModal}>
        <DialogContent className="sm:max-w-lg" data-testid="modal-goal">
          <DialogHeader>
            <DialogTitle>
              {editingGoal ? "Edit Goal" : "Create New Goal"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div>
              <Label>Goal Name</Label>
              <Input
                placeholder="e.g., Emergency Fund, Vacation, New Car"
                {...form.register("name")}
                data-testid="input-goal-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Target Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register("targetAmount")}
                  data-testid="input-target-amount"
                />
              </div>
              <div>
                <Label>Current Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register("currentAmount")}
                  data-testid="input-current-amount"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Select 
                  value={form.watch("priority")} 
                  onValueChange={(value) => form.setValue("priority", value as "low" | "medium" | "high")}
                >
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Category (Optional)</Label>
                <Select 
                  value={form.watch("categoryId") || ""} 
                  onValueChange={(value) => form.setValue("categoryId", value || undefined)}
                >
                  <SelectTrigger data-testid="select-goal-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No category</SelectItem>
                    {categories?.map((category: Category) => (
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
            </div>

            <div>
              <Label>Deadline (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    data-testid="button-deadline-picker"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch("deadline") ? format(new Date(form.watch("deadline")), "PPP") : "Pick a deadline"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={form.watch("deadline") ? new Date(form.watch("deadline")) : undefined}
                    onSelect={(date) => form.setValue("deadline", date?.toISOString())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowGoalModal(false)}
                data-testid="button-cancel-goal"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createGoalMutation.isPending || updateGoalMutation.isPending}
                data-testid="button-save-goal"
              >
                {createGoalMutation.isPending || updateGoalMutation.isPending 
                  ? "Saving..." 
                  : editingGoal ? "Update Goal" : "Create Goal"
                }
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
