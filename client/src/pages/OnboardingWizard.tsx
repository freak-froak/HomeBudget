import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage, supportedLanguages } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  ArrowLeft, ArrowRight, Check, Wallet, Globe, Target, 
  Settings, Sparkles, ChevronRight, Star, Home, Car, 
  Plane, GraduationCap, Heart, MapPin, Sun, Moon, Monitor
} from "lucide-react";

const steps = [
  { id: 1, title: "Welcome", description: "Get started with ExpenseJournal" },
  { id: 2, title: "Preferences", description: "Language, currency, and timezone" },
  { id: 3, title: "Goals", description: "Set your financial objectives" },
  { id: 4, title: "Categories", description: "Choose your expense categories" },
  { id: 5, title: "Complete", description: "You're all set!" }
];

const preferencesSchema = z.object({
  language: z.string(),
  currency: z.string(),
  timezone: z.string(),
  theme: z.string(),
});

const goalSchema = z.object({
  name: z.string().min(1, "Goal name is required"),
  targetAmount: z.string().min(1, "Target amount is required"),
  deadline: z.string().optional(),
});

type PreferencesData = z.infer<typeof preferencesSchema>;
type GoalData = z.infer<typeof goalSchema>;

const SUGGESTED_GOALS = [
  { name: "Emergency Fund", amount: "5000", icon: "🏥", description: "3-6 months of expenses" },
  { name: "Vacation Fund", amount: "2000", icon: "✈️", description: "Your dream getaway" },
  { name: "New Car", amount: "25000", icon: "🚗", description: "Reliable transportation" },
  { name: "Home Down Payment", amount: "50000", icon: "🏠", description: "Your first home" },
  { name: "Wedding Fund", amount: "15000", icon: "💍", description: "Your special day" },
  { name: "Education Fund", amount: "10000", icon: "🎓", description: "Invest in learning" },
];

const DEFAULT_CATEGORIES = [
  { name: "Food & Dining", icon: "🍽️", color: "#10B981", type: "expense", selected: true },
  { name: "Transportation", icon: "🚗", color: "#3B82F6", type: "expense", selected: true },
  { name: "Shopping", icon: "🛍️", color: "#8B5CF6", type: "expense", selected: true },
  { name: "Utilities", icon: "⚡", color: "#F59E0B", type: "expense", selected: true },
  { name: "Entertainment", icon: "🎬", color: "#EF4444", type: "expense", selected: true },
  { name: "Healthcare", icon: "🏥", color: "#EC4899", type: "expense", selected: false },
  { name: "Education", icon: "📚", color: "#06B6D4", type: "expense", selected: false },
  { name: "Travel", icon: "✈️", color: "#84CC16", type: "expense", selected: false },
  { name: "Fitness", icon: "💪", color: "#F97316", type: "expense", selected: false },
  { name: "Subscriptions", icon: "📱", color: "#6366F1", type: "expense", selected: false },
  { name: "Salary", icon: "💰", color: "#10B981", type: "income", selected: true },
  { name: "Freelance", icon: "💼", color: "#3B82F6", type: "income", selected: false },
  { name: "Investment", icon: "📈", color: "#8B5CF6", type: "income", selected: false },
];

export default function OnboardingWizard() {
  const { user } = useAuth();
  const { setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedGoals, setSelectedGoals] = useState<GoalData[]>([]);
  const [selectedCategories, setSelectedCategories] = useState(
    DEFAULT_CATEGORIES.filter(cat => cat.selected)
  );

  // Fetch currencies
  const { data: currencies } = useQuery({
    queryKey: ["/api/currencies"]
  });

  // Form for preferences
  const preferencesForm = useForm<PreferencesData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      language: "en",
      currency: "USD",
      timezone: "UTC",
      theme: "system",
    }
  });

  // Form for custom goal
  const goalForm = useForm<GoalData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: "",
      targetAmount: "",
      deadline: "",
    }
  });

  // Mutations
  const updateUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", "/api/auth/user", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    }
  });

  const createGoalsMutation = useMutation({
    mutationFn: async (goals: GoalData[]) => {
      const promises = goals.map(goal => 
        apiRequest("POST", "/api/goals", {
          ...goal,
          targetAmount: goal.targetAmount.toString(),
          currentAmount: "0",
          priority: "medium"
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    }
  });

  const createCategoriesMutation = useMutation({
    mutationFn: async (categories: typeof selectedCategories) => {
      const promises = categories.map(category => 
        apiRequest("POST", "/api/categories", {
          name: category.name,
          icon: category.icon,
          color: category.color,
          type: category.type,
          isDefault: false
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    }
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", "/api/auth/user", {
        onboardingCompleted: true
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Welcome to ExpenseJournal! 🎉" });
    }
  });

  const handleNext = async () => {
    if (currentStep === 2) {
      const data = preferencesForm.getValues();
      setLanguage(data.language);
      setTheme(data.theme as any);
      await updateUserMutation.mutateAsync({
        language: data.language,
        currency: data.currency,
        timezone: data.timezone,
        settings: {
          notifications: true,
          aiFeatures: true,
          widgetCustomization: {},
          dashboardLayout: []
        }
      });
    }
    
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    try {
      // Create goals
      if (selectedGoals.length > 0) {
        await createGoalsMutation.mutateAsync(selectedGoals);
      }

      // Create categories
      if (selectedCategories.length > 0) {
        await createCategoriesMutation.mutateAsync(selectedCategories);
      }

      // Complete onboarding
      await completeOnboardingMutation.mutateAsync();
    } catch (error) {
      toast({ 
        title: "Setup failed", 
        description: "There was an error completing your setup. Please try again.",
        variant: "destructive" 
      });
    }
  };

  const addCustomGoal = () => {
    const data = goalForm.getValues();
    if (data.name && data.targetAmount) {
      setSelectedGoals([...selectedGoals, data]);
      goalForm.reset();
    }
  };

  const removeGoal = (index: number) => {
    setSelectedGoals(selectedGoals.filter((_, i) => i !== index));
  };

  const toggleCategory = (category: typeof DEFAULT_CATEGORIES[0]) => {
    const isSelected = selectedCategories.some(cat => cat.name === category.name);
    if (isSelected) {
      setSelectedCategories(selectedCategories.filter(cat => cat.name !== category.name));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const progress = (currentStep / steps.length) * 100;

  const timezones = [
    { value: "UTC", label: "UTC" },
    { value: "America/New_York", label: "Eastern Time" },
    { value: "America/Chicago", label: "Central Time" },
    { value: "America/Denver", label: "Mountain Time" },
    { value: "America/Los_Angeles", label: "Pacific Time" },
    { value: "Europe/London", label: "London" },
    { value: "Europe/Paris", label: "Paris" },
    { value: "Asia/Tokyo", label: "Tokyo" },
    { value: "Australia/Sydney", label: "Sydney" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4" data-testid="page-onboarding">
      <div className="w-full max-w-4xl">
        {/* Progress Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-accent to-primary rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">ExpenseJournal</h1>
          </div>
          <div className="space-y-2">
            <div className="flex justify-center space-x-2">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    currentStep >= step.id ? "bg-accent" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <Progress value={progress} className="w-64 mx-auto h-2" />
            <p className="text-sm text-muted-foreground">
              Step {currentStep} of {steps.length}: {steps[currentStep - 1]?.title}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <Card className="glass-card border-border/50 max-w-2xl mx-auto">
          <CardContent className="p-8">
            {/* Step 1: Welcome */}
            {currentStep === 1 && (
              <div className="text-center space-y-6" data-testid="step-welcome">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-foreground">
                    Welcome to ExpenseJournal! 👋
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    Hi {user?.firstName}! Let's get you set up with your personal finance dashboard.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
                  {[
                    { icon: "🤖", title: "AI-Powered", description: "Smart expense categorization and insights" },
                    { icon: "📊", title: "Beautiful Analytics", description: "Understand your spending patterns" },
                    { icon: "🎯", title: "Goal Tracking", description: "Set and achieve financial goals" },
                    { icon: "🔒", title: "Secure & Private", description: "Your data is encrypted and safe" }
                  ].map((feature, index) => (
                    <div key={index} className="p-4 bg-muted/30 rounded-lg">
                      <div className="text-2xl mb-2">{feature.icon}</div>
                      <h3 className="font-semibold text-foreground">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground">
                  This setup will only take a few minutes and will help us personalize your experience.
                </p>
              </div>
            )}

            {/* Step 2: Preferences */}
            {currentStep === 2 && (
              <div className="space-y-6" data-testid="step-preferences">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">Set Your Preferences</h2>
                  <p className="text-muted-foreground">
                    Choose your language, currency, and other preferences
                  </p>
                </div>

                <form className="space-y-6">
                  <div>
                    <Label>Language</Label>
                    <Select 
                      value={preferencesForm.watch("language")} 
                      onValueChange={(value) => preferencesForm.setValue("language", value)}
                    >
                      <SelectTrigger data-testid="select-onboarding-language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {supportedLanguages.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            <div className="flex items-center space-x-2">
                              <span>{lang.flag}</span>
                              <span>{lang.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Currency</Label>
                    <Select 
                      value={preferencesForm.watch("currency")} 
                      onValueChange={(value) => preferencesForm.setValue("currency", value)}
                    >
                      <SelectTrigger data-testid="select-onboarding-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies?.map((currency: any) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            <div className="flex items-center space-x-2">
                              <span>{currency.symbol}</span>
                              <span>{currency.code} - {currency.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Timezone</Label>
                    <Select 
                      value={preferencesForm.watch("timezone")} 
                      onValueChange={(value) => preferencesForm.setValue("timezone", value)}
                    >
                      <SelectTrigger data-testid="select-onboarding-timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4" />
                              <span>{tz.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Theme Preference</Label>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      {[
                        { value: "light", label: "Light", icon: Sun },
                        { value: "dark", label: "Dark", icon: Moon },
                        { value: "system", label: "System", icon: Monitor }
                      ].map((themeOption) => {
                        const Icon = themeOption.icon;
                        return (
                          <button
                            key={themeOption.value}
                            type="button"
                            onClick={() => preferencesForm.setValue("theme", themeOption.value)}
                            className={`p-3 rounded-lg border-2 transition-colors ${
                              preferencesForm.watch("theme") === themeOption.value
                                ? "border-accent bg-accent/10"
                                : "border-border hover:border-accent/50"
                            }`}
                            data-testid={`button-theme-${themeOption.value}`}
                          >
                            <Icon className="w-5 h-5 mx-auto mb-1" />
                            <p className="text-sm font-medium">{themeOption.label}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Step 3: Goals */}
            {currentStep === 3 && (
              <div className="space-y-6" data-testid="step-goals">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">Set Financial Goals</h2>
                  <p className="text-muted-foreground">
                    Choose from suggested goals or create your own
                  </p>
                </div>

                {/* Suggested Goals */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Suggested Goals</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {SUGGESTED_GOALS.map((goal, index) => {
                      const isSelected = selectedGoals.some(g => g.name === goal.name);
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedGoals(selectedGoals.filter(g => g.name !== goal.name));
                            } else {
                              setSelectedGoals([...selectedGoals, {
                                name: goal.name,
                                targetAmount: goal.amount,
                                deadline: ""
                              }]);
                            }
                          }}
                          className={`p-3 rounded-lg border-2 text-left transition-colors ${
                            isSelected
                              ? "border-accent bg-accent/10"
                              : "border-border hover:border-accent/50"
                          }`}
                          data-testid={`button-goal-${index}`}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{goal.icon}</span>
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{goal.name}</p>
                              <p className="text-sm text-muted-foreground">{goal.description}</p>
                              <p className="text-sm font-medium text-accent">${goal.amount}</p>
                            </div>
                            {isSelected && <Check className="w-5 h-5 text-accent" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Goal */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Create Custom Goal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      placeholder="Goal name"
                      {...goalForm.register("name")}
                      data-testid="input-custom-goal-name"
                    />
                    <Input
                      type="number"
                      placeholder="Target amount"
                      {...goalForm.register("targetAmount")}
                      data-testid="input-custom-goal-amount"
                    />
                    <Button 
                      type="button" 
                      onClick={addCustomGoal}
                      variant="outline"
                      data-testid="button-add-custom-goal"
                    >
                      Add Goal
                    </Button>
                  </div>
                </div>

                {/* Selected Goals */}
                {selectedGoals.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-3">Your Goals ({selectedGoals.length})</h3>
                    <div className="space-y-2">
                      {selectedGoals.map((goal, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div>
                            <p className="font-medium text-foreground">{goal.name}</p>
                            <p className="text-sm text-muted-foreground">${goal.targetAmount}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeGoal(index)}
                            data-testid={`button-remove-goal-${index}`}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Categories */}
            {currentStep === 4 && (
              <div className="space-y-6" data-testid="step-categories">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">Choose Categories</h2>
                  <p className="text-muted-foreground">
                    Select the expense and income categories you want to track
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Expense Categories */}
                  <div>
                    <h3 className="font-semibold text-foreground mb-3">Expense Categories</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {DEFAULT_CATEGORIES.filter(cat => cat.type === "expense").map((category, index) => {
                        const isSelected = selectedCategories.some(cat => cat.name === category.name);
                        return (
                          <button
                            key={index}
                            onClick={() => toggleCategory(category)}
                            className={`p-3 rounded-lg border-2 text-left transition-colors ${
                              isSelected
                                ? "border-accent bg-accent/10"
                                : "border-border hover:border-accent/50"
                            }`}
                            data-testid={`button-category-${index}`}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-xl">{category.icon}</span>
                              <span className="text-sm font-medium text-foreground">{category.name}</span>
                              {isSelected && <Check className="w-4 h-4 text-accent ml-auto" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Income Categories */}
                  <div>
                    <h3 className="font-semibold text-foreground mb-3">Income Categories</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {DEFAULT_CATEGORIES.filter(cat => cat.type === "income").map((category, index) => {
                        const isSelected = selectedCategories.some(cat => cat.name === category.name);
                        return (
                          <button
                            key={index}
                            onClick={() => toggleCategory(category)}
                            className={`p-3 rounded-lg border-2 text-left transition-colors ${
                              isSelected
                                ? "border-accent bg-accent/10"
                                : "border-border hover:border-accent/50"
                            }`}
                            data-testid={`button-income-category-${index}`}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-xl">{category.icon}</span>
                              <span className="text-sm font-medium text-foreground">{category.name}</span>
                              {isSelected && <Check className="w-4 h-4 text-accent ml-auto" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">
                      Selected {selectedCategories.length} categories. You can always add more categories later in the settings.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Complete */}
            {currentStep === 5 && (
              <div className="text-center space-y-6" data-testid="step-complete">
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-accent to-primary rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    You're All Set! 🎉
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    Welcome to ExpenseJournal! Your personalized finance dashboard is ready.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <Settings className="w-8 h-8 text-accent mx-auto mb-2" />
                    <h3 className="font-semibold text-foreground">Preferences Set</h3>
                    <p className="text-sm text-muted-foreground">Language, currency, and theme configured</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <Target className="w-8 h-8 text-primary mx-auto mb-2" />
                    <h3 className="font-semibold text-foreground">{selectedGoals.length} Goals</h3>
                    <p className="text-sm text-muted-foreground">Financial objectives ready to track</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <Globe className="w-8 h-8 text-warning mx-auto mb-2" />
                    <h3 className="font-semibold text-foreground">{selectedCategories.length} Categories</h3>
                    <p className="text-sm text-muted-foreground">Expense categories ready for use</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Start by adding your first expense or exploring the dashboard to see your financial overview.
                  </p>
                  <Button 
                    onClick={handleFinish}
                    disabled={completeOnboardingMutation.isPending}
                    className="w-full"
                    data-testid="button-finish-onboarding"
                  >
                    {completeOnboardingMutation.isPending ? "Setting up..." : "Take me to my dashboard"}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Navigation */}
            {currentStep < 5 && (
              <div className="flex justify-between pt-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={updateUserMutation.isPending}
                  data-testid="button-next"
                >
                  {updateUserMutation.isPending ? "Saving..." : "Next"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
