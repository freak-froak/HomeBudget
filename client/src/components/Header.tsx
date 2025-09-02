import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, Bell, Plus } from "lucide-react";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications"],
    enabled: !!user
  });

  const unreadCount = notifications?.filter((n: any) => !n.isRead).length || 0;

  return (
    <header className="bg-card border-b border-border glass-card sticky top-0 z-30" data-testid="header">
      <div className="px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onMenuClick}
              data-testid="button-menu"
            >
              <Menu className="w-6 h-6" />
            </Button>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {t("navigation.dashboard")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("dashboard.welcome")}, {user?.firstName}! Here's your financial overview.
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative"
                  data-testid="button-notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                {notifications?.slice(0, 5).map((notification: any) => (
                  <DropdownMenuItem key={notification.id} className="p-4">
                    <div>
                      <p className="font-medium">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                    </div>
                  </DropdownMenuItem>
                ))}
                {(!notifications || notifications.length === 0) && (
                  <div className="p-4 text-center text-muted-foreground">
                    No notifications
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Add Expense Button */}
            <Button 
              className="flex items-center space-x-2"
              data-testid="button-add-expense"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t("dashboard.addExpense")}</span>
            </Button>

            {/* User Avatar */}
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.profileImageUrl} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
