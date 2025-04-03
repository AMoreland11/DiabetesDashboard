import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  Home,
  BookOpen,
  Utensils,
  StickyNote,
  Calendar as CalendarIcon,
  Settings,
  HelpCircle,
  LogOut,
  Clock
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";

interface SidebarProps {
  className?: string;
}

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
}

const SidebarItem = ({ icon, label, href, active }: SidebarItemProps) => (
  <Link href={href}>
    <a
      className={cn(
        "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        active
          ? "bg-primary bg-opacity-10 text-primary"
          : "text-gray-700 hover:bg-gray-100"
      )}
    >
      {icon}
      <span>{label}</span>
    </a>
  </Link>
);

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const userInitials = user?.name 
    ? getInitials(user.name) 
    : user?.username 
      ? user.username.substring(0, 2).toUpperCase() 
      : 'U';

  return (
    <>
      {/* Mobile Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 md:hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <button 
            type="button" 
            className="text-gray-500 hover:text-gray-700"
            onClick={toggleMobileMenu}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="text-xl font-semibold text-primary">GlucoTrack</div>
          
          <div className="flex items-center">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gray-200 text-gray-600">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar (hidden by default) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden" onClick={toggleMobileMenu}>
          <aside 
            className={cn(
              "bg-white w-64 h-full overflow-y-auto",
              className
            )}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-semibold text-primary">GlucoTrack</span>
              </div>
            </div>
            
            <nav className="p-4">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500 uppercase">Main</h3>
                </div>
                <div className="space-y-1">
                  <SidebarItem 
                    icon={<Home className="h-5 w-5" />} 
                    label="Dashboard" 
                    href="/dashboard" 
                    active={location === "/dashboard"} 
                  />
                  <SidebarItem 
                    icon={<BookOpen className="h-5 w-5" />} 
                    label="Glucose Log" 
                    href="/glucose-log" 
                    active={location === "/glucose-log"} 
                  />
                  <SidebarItem 
                    icon={<Utensils className="h-5 w-5" />} 
                    label="Meal Plans" 
                    href="/meal-plans" 
                    active={location === "/meal-plans"} 
                  />
                  <SidebarItem 
                    icon={<StickyNote className="h-5 w-5" />} 
                    label="Daily Notes" 
                    href="/daily-notes" 
                    active={location === "/daily-notes"} 
                  />
                  <SidebarItem 
                    icon={<CalendarIcon className="h-5 w-5" />} 
                    label="Calendar" 
                    href="/calendar" 
                    active={location === "/calendar"} 
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500 uppercase">Settings</h3>
                </div>
                <div className="space-y-1">
                  <SidebarItem 
                    icon={<Settings className="h-5 w-5" />} 
                    label="Account Settings" 
                    href="/account-settings" 
                    active={location === "/account-settings"} 
                  />
                  <SidebarItem 
                    icon={<HelpCircle className="h-5 w-5" />} 
                    label="Help & Support" 
                    href="/help" 
                    active={location === "/help"} 
                  />
                </div>
              </div>
            </nav>
            
            <div className="p-4 border-t">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gray-200 text-gray-600">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium">{user?.name || user?.username}</div>
                  <div className="text-xs text-gray-500">{user?.email}</div>
                </div>
                <button 
                  className="ml-auto p-1.5 rounded-full text-gray-500 hover:bg-gray-100"
                  onClick={() => logout()}
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "bg-white border-r border-gray-200 w-64 fixed h-screen hidden md:block overflow-y-auto",
          className
        )}
      >
        <div className="p-4 border-b">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-primary">GlucoTrack</span>
          </div>
        </div>
        
        <nav className="p-4">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Main</h3>
            </div>
            <div className="space-y-1">
              <SidebarItem 
                icon={<Home className="h-5 w-5" />} 
                label="Dashboard" 
                href="/dashboard" 
                active={location === "/dashboard"} 
              />
              <SidebarItem 
                icon={<BookOpen className="h-5 w-5" />} 
                label="Glucose Log" 
                href="/glucose-log" 
                active={location === "/glucose-log"} 
              />
              <SidebarItem 
                icon={<Utensils className="h-5 w-5" />} 
                label="Meal Plans" 
                href="/meal-plans" 
                active={location === "/meal-plans"} 
              />
              <SidebarItem 
                icon={<StickyNote className="h-5 w-5" />} 
                label="Daily Notes" 
                href="/daily-notes" 
                active={location === "/daily-notes"} 
              />
              <SidebarItem 
                icon={<CalendarIcon className="h-5 w-5" />} 
                label="Calendar" 
                href="/calendar" 
                active={location === "/calendar"} 
              />
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Settings</h3>
            </div>
            <div className="space-y-1">
              <SidebarItem 
                icon={<Settings className="h-5 w-5" />} 
                label="Account Settings" 
                href="/account-settings" 
                active={location === "/account-settings"} 
              />
              <SidebarItem 
                icon={<HelpCircle className="h-5 w-5" />} 
                label="Help & Support" 
                href="/help" 
                active={location === "/help"} 
              />
            </div>
          </div>
        </nav>
        
        <div className="p-4 border-t">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gray-200 text-gray-600">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm font-medium">{user?.name || user?.username}</div>
              <div className="text-xs text-gray-500">{user?.email}</div>
            </div>
            <button 
              className="ml-auto p-1.5 rounded-full text-gray-500 hover:bg-gray-100"
              onClick={() => logout()}
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
