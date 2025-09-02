import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface DashboardWidgetProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: "positive" | "negative" | "neutral";
  change?: {
    value: number;
    label: string;
  };
  borderColor?: string;
  borderStyle?: "solid" | "dashed" | "dotted" | "gradient" | "glow";
  borderWidth?: "thin" | "medium" | "thick";
  className?: string;
  customization?: {
    borderColor: string;
    borderStyle: string;
    borderWidth: string;
    backgroundColor: string;
    textColor: string;
  };
  onCustomize?: () => void;
  onRemove?: () => void;
}

export function DashboardWidget({
  title,
  value,
  icon,
  trend = "neutral",
  change,
  borderColor,
  borderStyle = "solid",
  borderWidth = "medium",
  className,
  customization,
  onCustomize,
  onRemove
}: DashboardWidgetProps) {
  const TrendIcon = trend === "positive" ? TrendingUp : trend === "negative" ? TrendingDown : Minus;
  const trendColor = trend === "positive" ? "text-success" : trend === "negative" ? "text-destructive" : "text-muted-foreground";

  const getBorderClasses = () => {
    const widthMap = {
      thin: "border",
      medium: "border-2", 
      thick: "border-4"
    };

    const styleMap = {
      solid: "border-solid",
      dashed: "border-dashed",
      dotted: "border-dotted",
      gradient: "border-gradient",
      glow: "border-glow"
    };

    let classes = `${widthMap[borderWidth]} ${styleMap[borderStyle]}`;
    
    if (borderColor) {
      classes += ` border-[${borderColor}]`;
    } else {
      const colorMap = {
        positive: "border-success/30",
        negative: "border-destructive/30", 
        neutral: "border-border"
      };
      classes += ` ${colorMap[trend]}`;
    }

    if (borderStyle === "glow") {
      classes += " shadow-lg";
    }

    return classes;
  };

  const cardStyle = customization ? {
    borderColor: customization.borderColor,
    backgroundColor: customization.backgroundColor,
    color: customization.textColor
  } : {};

  return (
    <Card 
      className={cn(
        "glass-card widget-hover",
        getBorderClasses(),
        borderStyle === "gradient" && "gradient-border",
        trend === "positive" && !borderColor && "pulse-border",
        className
      )}
      style={cardStyle}
      data-testid={`widget-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-muted/30 rounded-lg">
            {icon}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                data-testid="button-widget-menu"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onCustomize && (
                <DropdownMenuItem onClick={onCustomize} data-testid="menu-customize">
                  Customize Widget
                </DropdownMenuItem>
              )}
              {onRemove && (
                <DropdownMenuItem onClick={onRemove} className="text-destructive" data-testid="menu-remove">
                  Remove Widget
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold text-foreground" data-testid={`value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {change && (
            <div className="flex items-center mt-2">
              <TrendIcon className={cn("w-4 h-4 mr-1", trendColor)} />
              <span className={cn("text-sm", trendColor)}>
                {change.value > 0 ? "+" : ""}{change.value.toFixed(1)}% {change.label}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
