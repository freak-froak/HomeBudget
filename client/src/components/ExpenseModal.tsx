import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { insertExpenseSchema, type InsertExpense, type Expense, type Category } from "@shared/schema";
import { Calendar as CalendarIcon, Upload, X, Star, MapPin, Tag } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense?: Expense;
  onSuccess?: () => void;
}

export function ExpenseModal({ isOpen, onClose, expense, onSuccess }: ExpenseModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [lifestyleFile, setLifestyleFile] = useState<File | null>(null);
  const [newTag, setNewTag] = useState("");
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"]
  });

  const form = useForm<InsertExpense>({
    resolver: zodResolver(insertExpenseSchema),
    defaultValues: {
      amount: "0",
      description: "",
      categoryId: "",
      type: "expense",
      date: new Date(),
      location: "",
      tags: [],
      isFixed: false,
      satisfactionRating: 3
    }
  });

  // Load expense data for editing
  useEffect(() => {
    if (expense) {
      form.reset({
        ...expense,
        amount: expense.amount.toString(),
        tags: expense.tags || []
      });
    } else {
      form.reset({
        amount: "0",
        description: "",
        categoryId: "",
        type: "expense",
        date: new Date(),
        location: "",
        tags: [],
        isFixed: false,
        satisfactionRating: 3
      });
    }
  }, [expense, form]);

  const createExpenseMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/expenses", {
        method: "POST",
        body: data,
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to create expense");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Expense created successfully" });
      onSuccess?.();
      onClose();
    }
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Expense> }) => {
      const response = await apiRequest("PATCH", `/api/expenses/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Expense updated successfully" });
      onSuccess?.();
      onClose();
    }
  });

  const analyzeExpenseMutation = useMutation({
    mutationFn: async (data: { description: string; amount: number; location?: string }) => {
      const response = await apiRequest("POST", "/api/ai/analyze-expense", data);
      return response.json();
    },
    onSuccess: (analysis) => {
      if (analysis.category && categories) {
        const matchedCategory = categories.find((cat: Category) => 
          cat.name.toLowerCase() === analysis.category.toLowerCase()
        );
        if (matchedCategory) {
          form.setValue("categoryId", matchedCategory.id);
        }
      }
      
      if (analysis.suggestedTags) {
        form.setValue("tags", analysis.suggestedTags);
      }
      
      if (analysis.isFixed !== undefined) {
        form.setValue("isFixed", analysis.isFixed);
      }

      toast({ 
        title: "AI Analysis Complete", 
        description: analysis.insights 
      });
    }
  });

  const handleAIAnalysis = () => {
    const description = form.getValues("description");
    const amount = parseFloat(form.getValues("amount"));
    const location = form.getValues("location");

    if (!description.trim()) {
      toast({ title: "Please enter a description first", variant: "destructive" });
      return;
    }

    setAiAnalyzing(true);
    analyzeExpenseMutation.mutate(
      { description, amount, location },
      {
        onSettled: () => setAiAnalyzing(false)
      }
    );
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      const currentTags = form.getValues("tags") || [];
      if (!currentTags.includes(newTag.trim())) {
        form.setValue("tags", [...currentTags, newTag.trim()]);
      }
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue("tags", currentTags.filter(tag => tag !== tagToRemove));
  };

  const onSubmit = (data: InsertExpense) => {
    const formData = new FormData();
    
    // Add form fields
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (key === "tags") {
          formData.append(key, JSON.stringify(value));
        } else if (key === "date") {
          formData.append(key, (value as Date).toISOString());
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    // Add files
    if (receiptFile) {
      formData.append("receipt", receiptFile);
    }
    if (lifestyleFile) {
      formData.append("lifestylePhoto", lifestyleFile);
    }

    if (expense) {
      // For updates, use JSON instead of FormData for simplicity
      updateExpenseMutation.mutate({
        id: expense.id,
        updates: {
          ...data,
          amount: data.amount.toString()
        }
      });
    } else {
      createExpenseMutation.mutate(formData);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-expense">
        <DialogHeader>
          <DialogTitle>
            {expense ? "Edit Expense" : "Add New Expense"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Type Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select 
                value={form.watch("type")} 
                onValueChange={(value) => form.setValue("type", value as "expense" | "income")}
              >
                <SelectTrigger data-testid="select-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register("amount")}
                data-testid="input-amount"
              />
            </div>
          </div>

          {/* Description and AI Analysis */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Description</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAIAnalysis}
                disabled={aiAnalyzing || analyzeExpenseMutation.isPending}
                data-testid="button-ai-analyze"
              >
                {aiAnalyzing ? "Analyzing..." : "AI Analyze"}
              </Button>
            </div>
            <Textarea
              placeholder="Enter expense description..."
              {...form.register("description")}
              data-testid="input-description"
            />
          </div>

          {/* Category */}
          <div>
            <Label>Category</Label>
            <Select 
              value={form.watch("categoryId")} 
              onValueChange={(value) => form.setValue("categoryId", value)}
            >
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
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

          {/* Date */}
          <div>
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  data-testid="button-date-picker"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.watch("date") ? format(form.watch("date"), "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={form.watch("date")}
                  onSelect={(date) => date && form.setValue("date", date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Location */}
          <div>
            <Label>Location (Optional)</Label>
            <div className="flex space-x-2">
              <Input
                placeholder="Enter location..."
                {...form.register("location")}
                className="flex-1"
                data-testid="input-location"
              />
              <Button type="button" variant="outline" size="icon" data-testid="button-location">
                <MapPin className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Input
                  placeholder="Add tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                  data-testid="input-new-tag"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleAddTag}
                  data-testid="button-add-tag"
                >
                  <Tag className="w-4 h-4" />
                </Button>
              </div>
              
              {form.watch("tags") && form.watch("tags").length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.watch("tags").map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="flex items-center space-x-1"
                      data-testid={`badge-tag-${index}`}
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        data-testid={`button-remove-tag-${index}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* File Uploads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Receipt (Optional)</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="receipt-upload"
                  data-testid="input-receipt-file"
                />
                <Label 
                  htmlFor="receipt-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50"
                >
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    {receiptFile ? receiptFile.name : "Upload receipt"}
                  </span>
                </Label>
              </div>
            </div>

            <div>
              <Label>Lifestyle Photo (Optional)</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLifestyleFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="lifestyle-upload"
                  data-testid="input-lifestyle-file"
                />
                <Label 
                  htmlFor="lifestyle-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50"
                >
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    {lifestyleFile ? lifestyleFile.name : "Upload photo"}
                  </span>
                </Label>
              </div>
            </div>
          </div>

          {/* Satisfaction Rating */}
          <div>
            <Label>Satisfaction Rating</Label>
            <div className="flex items-center space-x-2 mt-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => form.setValue("satisfactionRating", rating)}
                  className="p-1"
                  data-testid={`button-rating-${rating}`}
                >
                  <Star 
                    className={`w-6 h-6 ${
                      (form.watch("satisfactionRating") || 0) >= rating
                        ? "fill-warning text-warning"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Fixed Expense Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Fixed/Recurring Expense</Label>
              <p className="text-sm text-muted-foreground">
                Mark if this is a regular recurring expense
              </p>
            </div>
            <Switch
              checked={form.watch("isFixed")}
              onCheckedChange={(checked) => form.setValue("isFixed", checked)}
              data-testid="switch-fixed"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}
              data-testid="button-save"
            >
              {createExpenseMutation.isPending || updateExpenseMutation.isPending 
                ? "Saving..." 
                : expense ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
