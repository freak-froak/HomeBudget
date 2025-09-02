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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  User, Settings as SettingsIcon, Globe, Palette, Bell, Bot, 
  Shield, Download, Trash2, Camera, Sun, Moon, Monitor,
  Save, AlertTriangle, Check, CreditCard, MapPin
} from "lucide-react";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
});

const settingsSchema = z.object({
  language: z.string(),
  currency: z.string(),
  timezone: z.string(),
  notifications: z.boolean(),
  aiFeatures: z.boolean(),
});

type ProfileData = z.infer<typeof profileSchema>;
type SettingsData = z.infer<typeof settingsSchema>;

export default function Settings() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("profile");

  // Fetch currencies
  const { data: currencies } = useQuery({
    queryKey: ["/api/currencies"]
  });

  // Profile form
  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
    }
  });

  // Settings form
  const settingsForm = useForm<SettingsData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      language: user?.language || "en",
      currency: user?.currency || "USD",
      timezone: user?.timezone || "UTC",
      notifications: user?.settings?.notifications ?? true,
      aiFeatures: user?.settings?.aiFeatures ?? true,
    }
  });

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      const response = await apiRequest("PATCH", "/api/auth/user", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Profile updated successfully" });
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SettingsData) => {
      const response = await apiRequest("PATCH", "/api/auth/user", {
        language: data.language,
        currency: data.currency,
        timezone: data.timezone,
        settings: {
          notifications: data.notifications,
          aiFeatures: data.aiFeatures,
          widgetCustomization: user?.settings?.widgetCustomization || {},
          dashboardLayout: user?.settings?.dashboardLayout || []
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLanguage(data.user.language);
      toast({ title: "Settings updated successfully" });
    }
  });

  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/user/export", { 
        credentials: "include" 
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'expense-journal-export.json';
      a.click();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({ title: "Data exported successfully" });
    }
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/user/data");
    },
    onSuccess: () => {
      toast({ title: "Account deleted successfully" });
      logout();
    }
  });

  const handleProfileSubmit = (data: ProfileData) => {
    updateProfileMutation.mutate(data);
  };

  const handleSettingsSubmit = (data: SettingsData) => {
    updateSettingsMutation.mutate(data);
  };

  const handleDeleteAccount = () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      deleteAccountMutation.mutate();
    }
  };

  const timezones = [
    { value: "UTC", label: "UTC" },
    { value: "America/New_York", label: "Eastern Time" },
    { value: "America/Chicago", label: "Central Time" },
    { value: "America/Denver", label: "Mountain Time" },
    { value: "America/Los_Angeles", label: "Pacific Time" },
    { value: "Europe/London", label: "London" },
    { value: "Europe/Paris", label: "Paris" },
    { value: "Europe/Berlin", label: "Berlin" },
    { value: "Asia/Tokyo", label: "Tokyo" },
    { value: "Asia/Shanghai", label: "Shanghai" },
    { value: "Australia/Sydney", label: "Sydney" },
  ];

  const sections = [
    { id: "profile", label: "Profile", icon: User },
    { id: "preferences", label: "Preferences", icon: SettingsIcon },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "ai", label: "AI Features", icon: Bot },
    { id: "privacy", label: "Privacy & Security", icon: Shield },
    { id: "data", label: "Data Management", icon: Download },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in" data-testid="page-settings">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("navigation.settings")}</h1>
          <p className="text-muted-foreground">Manage your account and application preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <Card className="glass-card h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Settings</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
                      activeSection === section.id
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                    data-testid={`button-section-${section.id}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile Section */}
          {activeSection === "profile" && (
            <Card className="glass-card" data-testid="card-profile-settings">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Profile Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-6">
                  {/* Avatar Section */}
                  <div className="flex items-center space-x-6">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={user?.profileImageUrl} />
                      <AvatarFallback className="text-lg">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Profile Picture</p>
                      <Button variant="outline" size="sm" data-testid="button-upload-avatar">
                        <Camera className="w-4 h-4 mr-2" />
                        Change Photo
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        {...profileForm.register("firstName")}
                        data-testid="input-first-name"
                      />
                      {profileForm.formState.errors.firstName && (
                        <p className="text-sm text-destructive mt-1">
                          {profileForm.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        {...profileForm.register("lastName")}
                        data-testid="input-last-name"
                      />
                      {profileForm.formState.errors.lastName && (
                        <p className="text-sm text-destructive mt-1">
                          {profileForm.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      {...profileForm.register("email")}
                      data-testid="input-email"
                    />
                    {profileForm.formState.errors.email && (
                      <p className="text-sm text-destructive mt-1">
                        {profileForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                      data-testid="button-save-profile"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Preferences Section */}
          {activeSection === "preferences" && (
            <Card className="glass-card" data-testid="card-preferences-settings">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="w-5 h-5" />
                  <span>Preferences</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={settingsForm.handleSubmit(handleSettingsSubmit)} className="space-y-6">
                  <div>
                    <Label>Language</Label>
                    <Select 
                      value={settingsForm.watch("language")} 
                      onValueChange={(value) => settingsForm.setValue("language", value)}
                    >
                      <SelectTrigger data-testid="select-language">
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
                      value={settingsForm.watch("currency")} 
                      onValueChange={(value) => settingsForm.setValue("currency", value)}
                    >
                      <SelectTrigger data-testid="select-currency">
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
                      value={settingsForm.watch("timezone")} 
                      onValueChange={(value) => settingsForm.setValue("timezone", value)}
                    >
                      <SelectTrigger data-testid="select-timezone">
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

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={updateSettingsMutation.isPending}
                      data-testid="button-save-preferences"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Appearance Section */}
          {activeSection === "appearance" && (
            <Card className="glass-card" data-testid="card-appearance-settings">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="w-5 h-5" />
                  <span>Appearance</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-medium">Theme</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Choose your preferred color theme
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { value: "light", label: "Light", icon: Sun, description: "Calming greens and trustworthy blues" },
                      { value: "dark", label: "Dark", icon: Moon, description: "Warm, cozy, homie colors" },
                      { value: "system", label: "System", icon: Monitor, description: "Follow system preference" }
                    ].map((themeOption) => {
                      const Icon = themeOption.icon;
                      return (
                        <button
                          key={themeOption.value}
                          onClick={() => setTheme(themeOption.value as any)}
                          className={`p-4 rounded-lg border-2 transition-colors text-left ${
                            theme === themeOption.value
                              ? "border-accent bg-accent/10"
                              : "border-border hover:border-accent/50"
                          }`}
                          data-testid={`button-theme-${themeOption.value}`}
                        >
                          <div className="flex items-center space-x-3 mb-2">
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{themeOption.label}</span>
                            {theme === themeOption.value && (
                              <Check className="w-4 h-4 text-accent" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {themeOption.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notifications Section */}
          {activeSection === "notifications" && (
            <Card className="glass-card" data-testid="card-notifications-settings">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="w-5 h-5" />
                  <span>Notifications</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={settingsForm.handleSubmit(handleSettingsSubmit)} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications about budget alerts, goal milestones, and AI insights
                      </p>
                    </div>
                    <Switch
                      checked={settingsForm.watch("notifications")}
                      onCheckedChange={(checked) => settingsForm.setValue("notifications", checked)}
                      data-testid="switch-notifications"
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Notification Types</h4>
                    <div className="space-y-3">
                      {[
                        { id: "budget", label: "Budget Alerts", description: "When you're approaching or exceeding budget limits" },
                        { id: "goals", label: "Goal Milestones", description: "When you reach important progress milestones" },
                        { id: "ai", label: "AI Insights", description: "Weekly insights about your spending patterns" },
                        { id: "bills", label: "Bill Reminders", description: "Reminders for upcoming recurring expenses" }
                      ].map((notificationType) => (
                        <div key={notificationType.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{notificationType.label}</p>
                            <p className="text-xs text-muted-foreground">{notificationType.description}</p>
                          </div>
                          <Switch defaultChecked data-testid={`switch-notification-${notificationType.id}`} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={updateSettingsMutation.isPending}
                      data-testid="button-save-notifications"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* AI Features Section */}
          {activeSection === "ai" && (
            <Card className="glass-card" data-testid="card-ai-settings">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bot className="w-5 h-5" />
                  <span>AI Features</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={settingsForm.handleSubmit(handleSettingsSubmit)} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Enable AI Features</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow AI to categorize expenses, provide insights, and give financial advice
                      </p>
                    </div>
                    <Switch
                      checked={settingsForm.watch("aiFeatures")}
                      onCheckedChange={(checked) => settingsForm.setValue("aiFeatures", checked)}
                      data-testid="switch-ai-features"
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">AI Capabilities</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { 
                          title: "Smart Categorization", 
                          description: "Automatically categorize expenses based on description and amount",
                          enabled: settingsForm.watch("aiFeatures")
                        },
                        { 
                          title: "Financial Insights", 
                          description: "Generate personalized spending pattern analysis and recommendations",
                          enabled: settingsForm.watch("aiFeatures")
                        },
                        { 
                          title: "Budget Optimization", 
                          description: "Suggest budget adjustments based on your spending habits",
                          enabled: settingsForm.watch("aiFeatures")
                        },
                        { 
                          title: "Goal Recommendations", 
                          description: "AI-powered suggestions for achievable financial goals",
                          enabled: settingsForm.watch("aiFeatures")
                        }
                      ].map((feature, index) => (
                        <div key={index} className="p-4 border border-border rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <h5 className="font-medium text-sm">{feature.title}</h5>
                            <Badge variant={feature.enabled ? "default" : "secondary"}>
                              {feature.enabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{feature.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={updateSettingsMutation.isPending}
                      data-testid="button-save-ai-settings"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Privacy & Security Section */}
          {activeSection === "privacy" && (
            <Card className="glass-card" data-testid="card-privacy-settings">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Privacy & Security</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Account Security</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Change Password</p>
                        <p className="text-xs text-muted-foreground">Update your account password</p>
                      </div>
                      <Button variant="outline" size="sm" data-testid="button-change-password">
                        Change
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Two-Factor Authentication</p>
                        <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                      </div>
                      <Badge variant="secondary">Coming Soon</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Data Privacy</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <h5 className="text-sm font-medium mb-2">How we use your data</h5>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Your financial data is encrypted and stored securely</li>
                        <li>• We never share your personal information with third parties</li>
                        <li>• AI analysis is performed locally when possible</li>
                        <li>• You can export or delete your data at any time</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Management Section */}
          {activeSection === "data" && (
            <Card className="glass-card" data-testid="card-data-settings">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="w-5 h-5" />
                  <span>Data Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Export Data</h4>
                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Export All Data</p>
                        <p className="text-xs text-muted-foreground">
                          Download a complete backup of your expenses, goals, budgets, and settings
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => exportDataMutation.mutate()}
                        disabled={exportDataMutation.isPending}
                        data-testid="button-export-data"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {exportDataMutation.isPending ? "Exporting..." : "Export"}
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium text-destructive">Danger Zone</h4>
                  <div className="p-4 border border-destructive/30 bg-destructive/5 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-destructive mb-2">Delete Account</h5>
                        <p className="text-xs text-muted-foreground mb-4">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={handleDeleteAccount}
                          disabled={deleteAccountMutation.isPending}
                          data-testid="button-delete-account"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
