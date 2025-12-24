import { Link, useLocation } from "wouter";
import { Calendar, LayoutDashboard, PieChart } from "lucide-react";
import { clsx } from "clsx";

export function Navigation() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Today", icon: Calendar },
    { href: "/weekly", label: "Week", icon: LayoutDashboard },
    { href: "/reports", label: "Reports", icon: PieChart },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-lg border-t border-border z-50 safe-area-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around h-16 px-4">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = location === href;
          return (
            <Link key={href} href={href}>
              <div
                className={clsx(
                  "flex flex-col items-center justify-center space-y-1 w-16 h-full transition-all duration-200 cursor-pointer",
                  isActive 
                    ? "text-primary scale-105" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={clsx("w-6 h-6", isActive && "fill-current/20")} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
