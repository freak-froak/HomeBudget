import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, registerSchema, type LoginData, type RegisterData } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  Wallet, TrendingUp, Shield, Smartphone, BarChart3, Bot, 
  Zap, Globe, Sun, Moon, Monitor 
} from "lucide-react";

export default function Landing() {
  const { login, register, isLoading, loginError, registerError } = useAuth();
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", firstName: "", lastName: "" }
  });

  const handleLogin = async (data: LoginData) => {
    try {
      await login(data.email, data.password);
      toast({ title: "Welcome back!" });
    } catch (error) {
      toast({ 
        title: "Login failed", 
        description: "Please check your credentials and try again.",
        variant: "destructive" 
      });
    }
  };

  const handleRegister = async (data: RegisterData) => {
    try {
      await register(data);
      toast({ title: "Account created successfully!" });
    } catch (error) {
      toast({ 
        title: "Registration failed", 
        description: "Please try again with different credentials.",
        variant: "destructive" 
      });
    }
  };

  const features = [
    {
      icon: <TrendingUp className="w-8 h-8 text-accent" />,
      title: "Smart Expense Tracking",
      description: "AI-powered categorization and insights for all your financial transactions."
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-primary" />,
      title: "Advanced Analytics",
      description: "Beautiful charts and reports to understand your spending patterns."
    },
    {
      icon: <Bot className="w-8 h-8 text-warning" />,
      title: "AI Financial Advisor",
      description: "Get personalized advice and recommendations based on your financial data."
    },
    {
      icon: <Shield className="w-8 h-8 text-success" />,
      title: "Secure & Private",
      description: "Your financial data is encrypted and never shared with third parties."
    },
    {
      icon: <Smartphone className="w-8 h-8 text-destructive" />,
      title: "Cross-Platform",
      description: "Works seamlessly on desktop, mobile, and tablet devices."
    },
    {
      icon: <Globe className="w-8 h-8 text-purple-500" />,
      title: "Multi-Currency",
      description: "Support for 20+ currencies with real-time exchange rates."
    }
  ];

  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-accent to-primary rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                {t("app.title")}
              </h1>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const themes = ["light", "dark", "system"] as const;
                const currentIndex = themes.indexOf(theme);
                const nextTheme = themes[(currentIndex + 1) % themes.length];
                setTheme(nextTheme);
              }}
              data-testid="button-theme-toggle"
            >
              <ThemeIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Hero Section */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight">
                Take Control of Your
                <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent"> Finances</span>
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                {t("app.tagline")} with AI-powered insights, beautiful visualizations, and intuitive expense tracking.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Zap className="w-5 h-5 text-accent" />
                <span>AI-Powered</span>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Shield className="w-5 h-5 text-success" />
                <span>Secure</span>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Smartphone className="w-5 h-5 text-primary" />
                <span>Cross-Platform</span>
              </div>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
              {features.map((feature, index) => (
                <Card 
                  key={index} 
                  className="glass-card border-border/50 hover:border-accent/30 transition-all duration-300"
                  data-testid={`card-feature-${index}`}
                >
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="w-12 h-12 bg-muted/30 rounded-xl flex items-center justify-center">
                        {feature.icon}
                      </div>
                      <h3 className="font-semibold text-foreground">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Authentication Card */}
          <div className="lg:pl-12">
            <Card className="glass-card border-border/50 max-w-md mx-auto">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-accent to-primary rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Get Started Today</CardTitle>
                <p className="text-muted-foreground">
                  Join thousands of users taking control of their finances
                </p>
              </CardHeader>

              <CardContent>
                <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as "login" | "register")}>
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="login" data-testid="tab-login">
                      {t("auth.login")}
                    </TabsTrigger>
                    <TabsTrigger value="register" data-testid="tab-register">
                      {t("auth.register")}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                      <div>
                        <Label>{t("auth.email")}</Label>
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          {...loginForm.register("email")}
                          data-testid="input-login-email"
                        />
                      </div>
                      <div>
                        <Label>{t("auth.password")}</Label>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          {...loginForm.register("password")}
                          data-testid="input-login-password"
                        />
                      </div>
                      {loginError && (
                        <p className="text-sm text-destructive">
                          Login failed. Please check your credentials.
                        </p>
                      )}
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={isLoading}
                        data-testid="button-login-submit"
                      >
                        {isLoading ? "Signing in..." : t("auth.loginButton")}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="register">
                    <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{t("auth.firstName")}</Label>
                          <Input
                            placeholder="First name"
                            {...registerForm.register("firstName")}
                            data-testid="input-register-firstname"
                          />
                        </div>
                        <div>
                          <Label>{t("auth.lastName")}</Label>
                          <Input
                            placeholder="Last name"
                            {...registerForm.register("lastName")}
                            data-testid="input-register-lastname"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>{t("auth.email")}</Label>
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          {...registerForm.register("email")}
                          data-testid="input-register-email"
                        />
                      </div>
                      <div>
                        <Label>{t("auth.password")}</Label>
                        <Input
                          type="password"
                          placeholder="Create a password (min. 6 characters)"
                          {...registerForm.register("password")}
                          data-testid="input-register-password"
                        />
                      </div>
                      {registerError && (
                        <p className="text-sm text-destructive">
                          Registration failed. Please try again.
                        </p>
                      )}
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={isLoading}
                        data-testid="button-register-submit"
                      >
                        {isLoading ? "Creating account..." : t("auth.registerButton")}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
