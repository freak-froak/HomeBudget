import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { ExpenseItem } from "@/components/ExpenseItem";
import { ExpenseModal } from "@/components/ExpenseModal";
import { CategoryManager } from "@/components/CategoryManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/authUtils";
import type { Expense, Category, ExpenseFilter } from "@shared/schema";
import { 
  Plus, Search, Filter, Calendar as CalendarIcon, Download, 
  SlidersHorizontal, Tags, MapPin, Star, Receipt, Camera,
  TrendingUp, TrendingDown, BarChart3, X, ChevronDown
} from "lucide-react";
import { format } from "date-fns";

export default function Expenses() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [amountRange, setAmountRange] = useState<{ min?: number; max?: number }>({});
  const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "income">("all");
  const [fixedFilter, setFixedFilter] = useState<"all" | "fixed" | "variable">("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "category">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Build filters
  const buildFilters = (): ExpenseFilter => {
    const filters: ExpenseFilter = {};
    
    if (searchTerm) filters.search = searchTerm;
    if (selectedCategories.length > 0) filters.categoryId = selectedCategories[0]; // API expects single category
    if (dateRange.from) filters.startDate = dateRange.from.toISOString();
    if (dateRange.to) filters.endDate = dateRange.to.toISOString();
    if (amountRange.min !== undefined) filters.minAmount = amountRange.min;
    if (amountRange.max !== undefined) filters.maxAmount = amountRange.max;
    if (typeFilter !== "all") filters.type = typeFilter as "expense" | "income";
    if (fixedFilter !== "all") filters.isFixed = fixedFilter === "fixed";
    
    return filters;
  };

  // Data fetching
  const { data: expenses, isLoading } = useQuery({
    queryKey: ["/api/expenses", buildFilters()],
    queryFn: async () => {
      const params = new URLSearchParams();
      const filters = buildFilters();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
      const response = await fetch(`/api/expenses?${params}`, { credentials: "include" });
      return response.json();
    }
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"]
  });

  // Mutations
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Expense deleted successfully" });
    }
  });

  const duplicateExpenseMutation = useMutation({
    mutationFn: async (expense: Expense) => {
      const { id, createdAt, updatedAt, ...expenseData } = expense;
      const response = await apiRequest("POST", "/api/expenses", {
        ...expenseData,
        description: `${expenseData.description} (Copy)`,
        date: new Date().toISOString()
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Expense duplicated successfully" });
    }
  });

  // Event handlers
  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowExpenseModal(true);
  };

  const handleDelete = (id: string) => {
    deleteExpenseMutation.mutate(id);
  };

  const handleDuplicate = (expense: Expense) => {
    duplicateExpenseMutation.mutate(expense);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategories([]);
    setSelectedTags([]);
    setDateRange({});
    setAmountRange({});
    setTypeFilter("all");
    setFixedFilter("all");
  };

  const getFilterCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (selectedCategories.length > 0) count++;
    if (selectedTags.length > 0) count++;
    if (dateRange.from || dateRange.to) count++;
    if (amountRange.min !== undefined || amountRange.max !== undefined) count++;
    if (typeFilter !== "all") count++;
    if (fixedFilter !== "all") count++;
    return count;
  };

  // Get all unique tags from expenses
  const allTags = expenses ? [...new Set(expenses.flatMap((e: Expense) => e.tags || []))] : [];

  // Sort and filter expenses
  const sortedExpenses = expenses ? [...expenses].sort((a: Expense, b: Expense) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case "amount":
        aValue = Number(a.amount);
        bValue = Number(b.amount);
        break;
      case "category":
        const aCat = categories?.find((c: Category) => c.id === a.categoryId)?.name || "";
        const bCat = categories?.find((c: Category) => c.id === b.categoryId)?.name || "";
        aValue = aCat;
        bValue = bCat;
        break;
      case "date":
      default:
        aValue = new Date(a.date).getTime();
        bValue = new Date(b.date).getTime();
        break;
    }
    
    if (sortOrder === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  }) : [];

  // Calculate totals
  const totalExpenses = expenses?.filter((e: Expense) => e.type === "expense").reduce((sum: number, e: Expense) => sum + Number(e.amount), 0) || 0;
  const totalIncome = expenses?.filter((e: Expense) => e.type === "income").reduce((sum: number, e: Expense) => sum + Number(e.amount), 0) || 0;
  const filteredExpensesCount = sortedExpenses.filter((e: Expense) => e.type === "expense").length;
  const filteredIncomeCount = sortedExpenses.filter((e: Expense) => e.type === "income").length;

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in" data-testid="page-expenses">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("navigation.expenses")}</h1>
          <p className="text-muted-foreground">Track and manage your expenses and income</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowCategoryManager(true)}
            data-testid="button-manage-categories"
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Manage Categories
          </Button>
          <Button 
            onClick={() => {
              setEditingExpense(null);
              setShowExpenseModal(true);
            }}
            data-testid="button-add-expense"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("dashboard.addExpense")}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(totalIncome)}</p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Balance</p>
                <p className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatCurrency(totalIncome - totalExpenses)}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold text-foreground">{expenses?.length || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {filteredExpensesCount} expenses, {filteredIncomeCount} income
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <Receipt className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="relative"
                  data-testid="button-toggle-filters"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {getFilterCount() > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs">
                      {getFilterCount()}
                    </Badge>
                  )}
                </Button>
                <Button variant="outline" data-testid="button-export">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="border-t border-border pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Category Filter */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Categories</label>
                    <Select value={selectedCategories[0] || ""} onValueChange={(value) => setSelectedCategories(value ? [value] : [])}>
                      <SelectTrigger data-testid="select-category-filter">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All categories</SelectItem>
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

                  {/* Type Filter */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Type</label>
                    <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
                      <SelectTrigger data-testid="select-type-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="expense">Expenses only</SelectItem>
                        <SelectItem value="income">Income only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fixed/Variable Filter */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Frequency</label>
                    <Select value={fixedFilter} onValueChange={(value) => setFixedFilter(value as typeof fixedFilter)}>
                      <SelectTrigger data-testid="select-frequency-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All frequencies</SelectItem>
                        <SelectItem value="fixed">Fixed only</SelectItem>
                        <SelectItem value="variable">Variable only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Date Range</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.from ? (
                            dateRange.to ? (
                              `${format(dateRange.from, "LLL dd")} - ${format(dateRange.to, "LLL dd")}`
                            ) : (
                              format(dateRange.from, "LLL dd, y")
                            )
                          ) : (
                            "Pick a date range"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={dateRange.from}
                          selected={{ from: dateRange.from, to: dateRange.to }}
                          onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Amount Range */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground block">Amount Range</label>
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={amountRange.min || ""}
                        onChange={(e) => setAmountRange(prev => ({ ...prev, min: e.target.value ? Number(e.target.value) : undefined }))}
                        data-testid="input-min-amount"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={amountRange.max || ""}
                        onChange={(e) => setAmountRange(prev => ({ ...prev, max: e.target.value ? Number(e.target.value) : undefined }))}
                        data-testid="input-max-amount"
                      />
                    </div>
                  </div>

                  {/* Sort Options */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Sort by</label>
                    <div className="flex space-x-2">
                      <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                        <SelectTrigger className="flex-1" data-testid="select-sort-by">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="amount">Amount</SelectItem>
                          <SelectItem value="category">Category</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                        data-testid="button-sort-order"
                      >
                        {sortOrder === "asc" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Active Filters */}
                {getFilterCount() > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">Active filters:</span>
                    {searchTerm && (
                      <Badge variant="secondary" className="flex items-center space-x-1">
                        <span>Search: {searchTerm}</span>
                        <button onClick={() => setSearchTerm("")} className="ml-1">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )}
                    {selectedCategories.length > 0 && (
                      <Badge variant="secondary" className="flex items-center space-x-1">
                        <span>Category: {categories?.find((c: Category) => c.id === selectedCategories[0])?.name}</span>
                        <button onClick={() => setSelectedCategories([])} className="ml-1">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )}
                    {typeFilter !== "all" && (
                      <Badge variant="secondary" className="flex items-center space-x-1">
                        <span>Type: {typeFilter}</span>
                        <button onClick={() => setTypeFilter("all")} className="ml-1">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )}
                    <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                      Clear all
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : sortedExpenses && sortedExpenses.length > 0 ? (
          sortedExpenses.map((expense: Expense) => (
            <ExpenseItem
              key={expense.id}
              expense={expense}
              category={categories?.find((c: Category) => c.id === expense.categoryId)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          ))
        ) : (
          <Card className="glass-card">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No expenses found</h3>
              <p className="text-muted-foreground mb-4">
                {getFilterCount() > 0 
                  ? "Try adjusting your filters or search terms."
                  : "Start tracking your finances by adding your first expense."
                }
              </p>
              {getFilterCount() > 0 ? (
                <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters-empty">
                  Clear filters
                </Button>
              ) : (
                <Button onClick={() => setShowExpenseModal(true)} data-testid="button-add-first-expense">
                  <Plus className="w-4 h-4 mr-2" />
                  Add your first expense
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modals */}
      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => {
          setShowExpenseModal(false);
          setEditingExpense(null);
        }}
        expense={editingExpense}
        onSuccess={() => {
          setShowExpenseModal(false);
          setEditingExpense(null);
        }}
      />

      <CategoryManager
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
      />
    </div>
  );
}
