import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, LogOut, Moon, Sun, User, UserPlus } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { LoginModal } from "./LoginModal";
import "../assets/minecraft-styles.css";

export function Header() {
  const [activeTab, setActiveTab] = useState<"forum" | "chat">("forum");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { user, logout, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Set active tab based on URL path
    if (location === "/" || location.includes("/forum")) {
      setActiveTab("forum");
    } else if (location.includes("/chat")) {
      setActiveTab("chat");
    }
  }, [location]);

  const handleTabChange = (tab: "forum" | "chat") => {
    setActiveTab(tab);
    setLocation(`/${tab}`);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="minecraft-navbar sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <img
                // src="https://roguecraft.asia/assets/image/bannermc.png"
                src="./src/assets/images/logo.png"
                alt="Roguecraft Logo"
                className="h-8 w-auto"
                style={{ imageRendering: 'pixelated' }}
              />
              <span className="font-['VT323'] text-2xl text-[#ffff55]" style={{ textShadow: '2px 2px 0px #3f3f00' }}>
                Roguecraft
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <Button
              variant="minecraft"
              className={activeTab === "forum" ? "border-[#ffff55]" : ""}
              onClick={() => handleTabChange("forum")}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 mr-2"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              Diễn Đàn
            </Button>
            <Button
              variant="minecraft"
              className={activeTab === "chat" ? "border-[#ffff55]" : ""}
              onClick={() => handleTabChange("chat")}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 mr-2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              Nơi xàm lul
            </Button>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="minecraft"
              size="icon"
              className="rounded-none"
              onClick={toggleTheme}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="minecraft"
                    className="flex items-center space-x-2 rounded-none"
                  >
                    <Avatar className="h-8 w-8">
                      {user?.avatar ? (
                        <AvatarImage src={user.avatar} alt={user.username} />
                      ) : (
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {user?.username?.substring(0, 2).toUpperCase() || "U"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="hidden md:block font-['VT323'] text-lg">{user?.username}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="minecraft-card rounded-none border-2 border-t-[#6b6b6b] border-l-[#6b6b6b] border-r-[#2d2d2d] border-b-[#2d2d2d] p-0">
                  {/* <DropdownMenuItem
                    className="cursor-pointer font-['VT323'] text-lg hover:bg-[#535353]"
                    onClick={() => {
                      if (user?.isTemporary) {
                        setIsLoginModalOpen(true);
                      } else {
                        setLocation(`/user/${user?.id}`);
                      }
                    }}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Trang cá nhân</span>
                  </DropdownMenuItem> */}
                  {/* <DropdownMenuSeparator /> */}
                  <DropdownMenuItem onClick={logout} className="cursor-pointer font-['VT323'] text-lg hover:bg-[#535353] text-red-400">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Đăng xuất</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="minecraft"
                onClick={() => setIsLoginModalOpen(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                <span className="font-['VT323'] text-lg">Đăng nhập</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden">
        <div className="grid grid-cols-2 w-full">
          <Button
            variant="minecraft"
            className={`text-center py-3 rounded-none ${
              activeTab === "forum" ? "border-t-[#ffff55] border-l-[#ffff55]" : ""
            }`}
            onClick={() => handleTabChange("forum")}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 mr-2"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span className="font-['VT323'] text-lg">Diễn Đàn</span>
          </Button>
          <Button
            variant="minecraft"
            className={`text-center py-3 rounded-none ${
              activeTab === "chat" ? "border-t-[#ffff55] border-l-[#ffff55]" : ""
            }`}
            onClick={() => handleTabChange("chat")}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 mr-2"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span className="font-['VT323'] text-lg">Nơi xàm lul</span>
          </Button>
        </div>
      </div>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </header>
  );
}
