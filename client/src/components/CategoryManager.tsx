import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertCategorySchema, type InsertCategory, type Category } from "@shared/schema";
import { Plus, Edit, Trash2, Save } from "lucide-react";

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_ICONS = [
  "🍽️", "🚗", "🛍️", "⚡", "🎬", "🏥", "📚", "✈️", "💪", "📱",
  "🏠", "💳", "🎵", "🎮", "👕", "💄", "🐕", "🌱", "🔧", "🎯",
  "☕", "🍕", "🚕", "🚌", "⛽", "🏪", "💊", "📖", "🎭", "🏋️"
];

const PRESET_COLORS = [
  "#10B981", "#059669", "#3B82F6", "#1D4ED8", "#EF4444", "#DC2626",
  "#8B5CF6", "#7C3AED", "#F59E0B", "#D97706", "#6B7280", "#4B5563",
  "#EC4899", "#DB2777", "#06B6D4", "#0891B2", "#84CC16", "#65A30D"
];

export function CategoryManager({ isOpen, onClose }: CategoryManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["/api/categories"],
    enabled: isOpen
  });

  const form = useForm<InsertCategory>({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: {
      name: "",
      icon: "💰",
      color: "#10B981",
      type: "expense"
    }
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: InsertCategory) => {
      const response = await apiRequest("POST", "/api/categories", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Category created successfully" });
      setShowForm(false);
      form.reset();
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Category> }) => {
      const response = await apiRequest("PATCH", `/api/categories/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Category updated successfully" });
      setEditingCategory(null);
      form.reset();
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Category deleted successfully" });
    }
  });

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    form.reset(category);
    setShowForm(true);
  };

  const handleSubmit = (data: InsertCategory) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({
        id: editingCategory.id,
        updates: data
      });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCategory(null);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="modal-category-manager">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Category Button */}
          {!showForm && (
            <Button 
              onClick={() => setShowForm(true)}
              className="w-full"
              data-testid="button-add-category"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Category
            </Button>
          )}

          {/* Category Form */}
          {showForm && (
            <Card className="border-2 border-accent/30">
              <CardContent className="p-6">
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Category Name</Label>
                      <Input
                        placeholder="Enter category name"
                        {...form.register("name")}
                        data-testid="input-category-name"
                      />
                    </div>

                    <div>
                      <Label>Type</Label>
                      <Select 
                        value={form.watch("type")} 
                        onValueChange={(value) => form.setValue("type", value as "expense" | "income")}
                      >
                        <SelectTrigger data-testid="select-category-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="expense">Expense</SelectItem>
                          <SelectItem value="income">Income</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Icon</Label>
                    <div className="grid grid-cols-10 gap-2 mt-2 max-h-32 overflow-y-auto border border-border rounded-lg p-2">
                      {CATEGORY_ICONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-muted transition-colors ${
                            form.watch("icon") === icon ? "bg-accent text-accent-foreground" : ""
                          }`}
                          onClick={() => form.setValue("icon", icon)}
                          data-testid={`button-icon-${icon}`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Color</Label>
                    <div className="mt-2 space-y-2">
                      <Input
                        type="color"
                        value={form.watch("color")}
                        onChange={(e) => form.setValue("color", e.target.value)}
                        className="w-full h-10"
                        data-testid="input-category-color"
                      />
                      <div className="grid grid-cols-9 gap-2">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className="w-8 h-8 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                            onClick={() => form.setValue("color", color)}
                            data-testid={`button-preset-color-${color.slice(1)}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleCancel}
                      data-testid="button-cancel-category"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                      data-testid="button-save-category"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {editingCategory ? "Update" : "Create"} Category
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Existing Categories */}
          <div className="space-y-4">
            <h3 className="font-semibold">Your Categories</h3>
            
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading categories...
              </div>
            ) : categories && categories.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category: Category) => (
                  <Card 
                    key={category.id} 
                    className="border hover:shadow-md transition-shadow"
                    data-testid={`card-category-${category.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                            style={{ backgroundColor: `${category.color}20` }}
                          >
                            {category.icon}
                          </div>
                          <div>
                            <p className="font-medium">{category.name}</p>
                            <Badge 
                              variant={category.type === "income" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {category.type}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(category)}
                            data-testid={`button-edit-category-${category.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {!category.isDefault && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteCategoryMutation.mutate(category.id)}
                              className="text-destructive hover:text-destructive"
                              data-testid={`button-delete-category-${category.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No categories found. Create your first category to get started.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
