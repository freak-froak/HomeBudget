import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Copy, MapPin, Star, Receipt, Camera } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/authUtils";
import { cn } from "@/lib/utils";
import type { Expense, Category } from "@shared/schema";

interface ExpenseItemProps {
  expense: Expense;
  category?: Category;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onDuplicate: (expense: Expense) => void;
}

export function ExpenseItem({ expense, category, onEdit, onDelete, onDuplicate }: ExpenseItemProps) {
  const [imageError, setImageError] = useState(false);

  const getCategoryIcon = (categoryName?: string) => {
    const iconMap: Record<string, string> = {
      "food": "🍽️",
      "transportation": "🚗",
      "shopping": "🛍️",
      "utilities": "⚡",
      "entertainment": "🎬",
      "healthcare": "🏥",
      "education": "📚",
      "travel": "✈️",
      "fitness": "💪",
      "subscription": "📱"
    };

    return iconMap[categoryName?.toLowerCase() || ""] || "💰";
  };

  const isIncome = expense.type === "income";

  return (
    <Card 
      className="glass-card widget-hover transition-all duration-200 hover:shadow-lg"
      data-testid={`expense-item-${expense.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            {/* Category Icon */}
            <Avatar className="w-12 h-12 shrink-0">
              <AvatarFallback 
                className={cn(
                  "text-lg",
                  isIncome ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
                )}
                style={{ backgroundColor: category?.color ? `${category.color}20` : undefined }}
              >
                {category?.icon || getCategoryIcon(category?.name)}
              </AvatarFallback>
            </Avatar>

            {/* Expense Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium text-foreground truncate" data-testid={`text-description-${expense.id}`}>
                  {expense.description}
                </h4>
                <p 
                  className={cn(
                    "text-lg font-bold shrink-0",
                    isIncome ? "text-success" : "text-destructive"
                  )}
                  data-testid={`text-amount-${expense.id}`}
                >
                  {isIncome ? "+" : "-"}{formatCurrency(Number(expense.amount))}
                </p>
              </div>

              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span data-testid={`text-date-${expense.id}`}>
                  {formatDateTime(expense.date)}
                </span>
                
                {category && (
                  <Badge 
                    variant="secondary" 
                    className="text-xs"
                    style={{ 
                      backgroundColor: category.color ? `${category.color}20` : undefined,
                      color: category.color || undefined 
                    }}
                    data-testid={`badge-category-${expense.id}`}
                  >
                    {category.name}
                  </Badge>
                )}

                {expense.isFixed && (
                  <Badge variant="outline" className="text-xs" data-testid={`badge-fixed-${expense.id}`}>
                    Fixed
                  </Badge>
                )}
              </div>

              {/* Additional Details */}
              <div className="flex items-center space-x-4 mt-2">
                {expense.location && (
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate max-w-24" data-testid={`text-location-${expense.id}`}>
                      {expense.location}
                    </span>
                  </div>
                )}

                {expense.satisfactionRating && (
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Star className="w-3 h-3 fill-current text-warning" />
                    <span data-testid={`text-rating-${expense.id}`}>
                      {expense.satisfactionRating}/5
                    </span>
                  </div>
                )}

                {expense.receiptUrl && (
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Receipt className="w-3 h-3" />
                    <span>Receipt</span>
                  </div>
                )}

                {expense.lifestylePhotoUrl && (
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Camera className="w-3 h-3" />
                    <span>Photo</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {expense.tags && expense.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {expense.tags.slice(0, 3).map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="text-xs px-2 py-0"
                      data-testid={`badge-tag-${expense.id}-${index}`}
                    >
                      {tag}
                    </Badge>
                  ))}
                  {expense.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs px-2 py-0">
                      +{expense.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 shrink-0"
                data-testid={`button-actions-${expense.id}`}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => onEdit(expense)}
                data-testid={`menu-edit-${expense.id}`}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDuplicate(expense)}
                data-testid={`menu-duplicate-${expense.id}`}
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(expense.id)}
                className="text-destructive"
                data-testid={`menu-delete-${expense.id}`}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Receipt/Lifestyle Photo Preview */}
        {(expense.receiptUrl || expense.lifestylePhotoUrl) && (
          <div className="mt-4 flex space-x-2">
            {expense.receiptUrl && (
              <div className="relative">
                <img
                  src={`/uploads/${expense.receiptUrl}`}
                  alt="Receipt"
                  className="w-16 h-16 object-cover rounded-lg border border-border"
                  onError={() => setImageError(true)}
                  data-testid={`img-receipt-${expense.id}`}
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                  <Receipt className="w-2 h-2 text-primary-foreground" />
                </div>
              </div>
            )}
            
            {expense.lifestylePhotoUrl && (
              <div className="relative">
                <img
                  src={`/uploads/${expense.lifestylePhotoUrl}`}
                  alt="Lifestyle"
                  className="w-16 h-16 object-cover rounded-lg border border-border"
                  onError={() => setImageError(true)}
                  data-testid={`img-lifestyle-${expense.id}`}
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full flex items-center justify-center">
                  <Camera className="w-2 h-2 text-accent-foreground" />
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
