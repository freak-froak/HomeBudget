import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, Receipt, Target, Calendar, BarChart3, 
  Calculator, Bot, Settings, LogOut, Wallet, Sun, Moon, 
  Monitor 
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

export function Sidebar({ isOpen, onClose, isMobile }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();

  const navigation = [
    { name: t("navigation.dashboard"), href: "/dashboard", icon: LayoutDashboard },
    { name: t("navigation.expenses"), href: "/expenses", icon: Receipt },
    { name: t("navigation.goals"), href: "/goals", icon: Target },
    { name: t("navigation.calendar"), href: "/calendar", icon: Calendar },
    { name: t("navigation.analytics"), href: "/analytics", icon: BarChart3 },
    { name: t("navigation.budget"), href: "/budget", icon: Calculator },
  ];

  const secondaryNav = [
    { name: t("navigation.aiAssistant"), href: "/ai-assistant", icon: Bot },
    { name: t("navigation.settings"), href: "/settings", icon: Settings },
  ];

  const handleThemeChange = () => {
    const themes = ["light", "dark", "system"] as const;
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  };

  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <aside 
      className={cn(
        "w-64 bg-sidebar border-r border-sidebar-border glass-card fixed left-0 top-0 h-full z-50 transition-transform duration-300",
        isMobile ? (isOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0",
        !isMobile && "lg:block"
      )}
      data-testid="sidebar"
    >
      <div className="p-6">
        {/* Logo */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-8 h-8 bg-gradient-to-r from-accent to-primary rounded-lg flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-sidebar-foreground">
            {t("app.title")}
          </h1>
        </div>
        
        {/* Main Navigation */}
        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <a 
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-accent-foreground/20" 
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                  onClick={isMobile ? onClose : undefined}
                  data-testid={`nav-${item.href.slice(1)}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </a>
              </Link>
            );
          })}
        </nav>

        {/* Secondary Navigation */}
        <div className="mt-8 pt-8 border-t border-sidebar-border">
          <div className="space-y-2">
            {secondaryNav.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <a 
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                      isActive 
                        ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                        : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    )}
                    onClick={isMobile ? onClose : undefined}
                    data-testid={`nav-${item.href.slice(1)}`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </a>
                </Link>
              );
            })}
            
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              className="w-full justify-start space-x-3 px-3 py-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              onClick={handleThemeChange}
              data-testid="button-theme-toggle"
            >
              <ThemeIcon className="w-5 h-5" />
              <span>Theme</span>
            </Button>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="glass-card rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user?.profileImageUrl} />
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">Premium Member</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
              onClick={logout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
