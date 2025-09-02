import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette, Zap, Square, Circle } from "lucide-react";

interface WidgetCustomization {
  borderColor: string;
  borderStyle: "solid" | "dashed" | "dotted" | "gradient" | "glow";
  borderWidth: "thin" | "medium" | "thick";
  backgroundColor: string;
  textColor: string;
  opacity: number;
  cornerRadius: number;
  shadowDepth: number;
  animationSpeed: number;
}

interface WidgetCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  widgetName: string;
  currentCustomization: WidgetCustomization;
  onSave: (customization: WidgetCustomization) => void;
}

const PRESET_COLORS = [
  "#10B981", "#059669", // Calming greens
  "#3B82F6", "#1D4ED8", // Trustworthy blues  
  "#EF4444", "#DC2626", // Alert reds
  "#8B5CF6", "#7C3AED", // Goal purples
  "#F59E0B", "#D97706", // Warning oranges
  "#6B7280", "#4B5563", // Neutral grays
];

const DARK_PRESET_COLORS = [
  "#8B4513", "#A0522D", // Warm browns
  "#FF8C42", "#FF6B35", // Cozy oranges
  "#8FBC8F", "#90EE90", // Culinary greens
  "#CD853F", "#DEB887", // Warm tans
  "#B8860B", "#DAA520", // Golden yellows
  "#BC8F8F", "#F5DEB3", // Soft roses/wheats
];

export function WidgetCustomizer({ 
  isOpen, 
  onClose, 
  widgetName, 
  currentCustomization, 
  onSave 
}: WidgetCustomizerProps) {
  const [customization, setCustomization] = useState<WidgetCustomization>(currentCustomization);

  const updateCustomization = (key: keyof WidgetCustomization, value: any) => {
    setCustomization(prev => ({ ...prev, [key]: value }));
  };

  const handlePresetColor = (color: string, target: 'border' | 'background' | 'text') => {
    const targetKey = target === 'border' ? 'borderColor' : 
                     target === 'background' ? 'backgroundColor' : 'textColor';
    updateCustomization(targetKey, color);
  };

  const handleSave = () => {
    onSave(customization);
    onClose();
  };

  const resetToDefault = () => {
    setCustomization({
      borderColor: "#10B981",
      borderStyle: "solid",
      borderWidth: "medium",
      backgroundColor: "transparent",
      textColor: "inherit",
      opacity: 100,
      cornerRadius: 12,
      shadowDepth: 2,
      animationSpeed: 300
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-widget-customizer">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Palette className="w-5 h-5" />
            <span>Customize {widgetName} Widget</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customization Controls */}
          <div className="space-y-6">
            {/* Border Customization */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center space-x-2">
                <Square className="w-4 h-4" />
                <span>Border Style</span>
              </h3>
              
              <div>
                <Label>Border Color</Label>
                <div className="mt-2 space-y-2">
                  <Input
                    type="color"
                    value={customization.borderColor}
                    onChange={(e) => updateCustomization("borderColor", e.target.value)}
                    className="w-full h-10"
                    data-testid="input-border-color"
                  />
                  <div className="grid grid-cols-6 gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        onClick={() => handlePresetColor(color, 'border')}
                        data-testid={`button-preset-border-${color.slice(1)}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label>Border Style</Label>
                <Select 
                  value={customization.borderStyle} 
                  onValueChange={(value) => updateCustomization("borderStyle", value)}
                >
                  <SelectTrigger data-testid="select-border-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="dashed">Dashed</SelectItem>
                    <SelectItem value="dotted">Dotted</SelectItem>
                    <SelectItem value="gradient">Gradient</SelectItem>
                    <SelectItem value="glow">Glow Effect</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Border Width</Label>
                <Select 
                  value={customization.borderWidth} 
                  onValueChange={(value) => updateCustomization("borderWidth", value)}
                >
                  <SelectTrigger data-testid="select-border-width">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thin">Thin</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="thick">Thick</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Background Customization */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center space-x-2">
                <Circle className="w-4 h-4" />
                <span>Background & Text</span>
              </h3>
              
              <div>
                <Label>Background Color</Label>
                <div className="mt-2 space-y-2">
                  <Input
                    type="color"
                    value={customization.backgroundColor}
                    onChange={(e) => updateCustomization("backgroundColor", e.target.value)}
                    className="w-full h-10"
                    data-testid="input-background-color"
                  />
                  <div className="grid grid-cols-6 gap-2">
                    {DARK_PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        onClick={() => handlePresetColor(color, 'background')}
                        data-testid={`button-preset-bg-${color.slice(1)}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label>Text Color</Label>
                <Input
                  type="color"
                  value={customization.textColor}
                  onChange={(e) => updateCustomization("textColor", e.target.value)}
                  className="w-full h-10 mt-2"
                  data-testid="input-text-color"
                />
              </div>
            </div>

            <Separator />

            {/* Advanced Properties */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>Advanced</span>
              </h3>
              
              <div>
                <Label>Opacity ({customization.opacity}%)</Label>
                <Slider
                  value={[customization.opacity]}
                  onValueChange={([value]) => updateCustomization("opacity", value)}
                  max={100}
                  min={10}
                  step={5}
                  className="mt-2"
                  data-testid="slider-opacity"
                />
              </div>

              <div>
                <Label>Corner Radius ({customization.cornerRadius}px)</Label>
                <Slider
                  value={[customization.cornerRadius]}
                  onValueChange={([value]) => updateCustomization("cornerRadius", value)}
                  max={24}
                  min={0}
                  step={2}
                  className="mt-2"
                  data-testid="slider-corner-radius"
                />
              </div>

              <div>
                <Label>Shadow Depth ({customization.shadowDepth}px)</Label>
                <Slider
                  value={[customization.shadowDepth]}
                  onValueChange={([value]) => updateCustomization("shadowDepth", value)}
                  max={20}
                  min={0}
                  step={1}
                  className="mt-2"
                  data-testid="slider-shadow-depth"
                />
              </div>

              <div>
                <Label>Animation Speed ({customization.animationSpeed}ms)</Label>
                <Slider
                  value={[customization.animationSpeed]}
                  onValueChange={([value]) => updateCustomization("animationSpeed", value)}
                  max={1000}
                  min={100}
                  step={50}
                  className="mt-2"
                  data-testid="slider-animation-speed"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <h3 className="font-semibold">Live Preview</h3>
            
            <Card 
              className="glass-card"
              style={{
                borderColor: customization.borderColor,
                borderStyle: customization.borderStyle === "gradient" ? "solid" : customization.borderStyle,
                borderWidth: customization.borderWidth === "thin" ? "1px" : 
                           customization.borderWidth === "medium" ? "2px" : "4px",
                backgroundColor: customization.backgroundColor === "transparent" ? undefined : customization.backgroundColor,
                color: customization.textColor === "inherit" ? undefined : customization.textColor,
                opacity: customization.opacity / 100,
                borderRadius: `${customization.cornerRadius}px`,
                boxShadow: customization.borderStyle === "glow" 
                  ? `0 0 ${customization.shadowDepth * 2}px ${customization.borderColor}40`
                  : `0 ${customization.shadowDepth}px ${customization.shadowDepth * 2}px rgba(0,0,0,0.1)`,
                transition: `all ${customization.animationSpeed}ms ease-in-out`
              }}
              data-testid="widget-preview"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-muted/30 rounded-lg">
                    <Circle className="w-6 h-6" />
                  </div>
                  <Badge variant="secondary">Preview</Badge>
                </div>
                <div>
                  <p className="text-sm opacity-70 mb-1">{widgetName}</p>
                  <p className="text-2xl font-bold">$1,234.56</p>
                  <div className="flex items-center mt-2">
                    <span className="text-sm">Sample data</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Style Information */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <h4 className="font-medium">Current Settings</h4>
              <div className="text-sm space-y-1 text-muted-foreground">
                <div>Border: {customization.borderStyle} {customization.borderWidth}</div>
                <div>Opacity: {customization.opacity}%</div>
                <div>Radius: {customization.cornerRadius}px</div>
                <div>Shadow: {customization.shadowDepth}px</div>
                <div>Animation: {customization.animationSpeed}ms</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4">
          <Button 
            variant="outline" 
            onClick={resetToDefault}
            data-testid="button-reset-default"
          >
            Reset to Default
          </Button>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              data-testid="button-cancel-customization"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              data-testid="button-save-customization"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
