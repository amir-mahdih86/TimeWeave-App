import { Link, useLocation } from "wouter";
import { Calendar, LayoutDashboard, PieChart, Settings } from "lucide-react";
import { clsx } from "clsx";

export function Navigation() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Daily Plans", icon: Calendar },
    { href: "/weekly", label: "Fixed Tasks", icon: LayoutDashboard },
    { href: "/reports", label: "Reports", icon: PieChart },
    { href: "/settings", label: "Settings", icon: Settings },
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
                  "relative flex flex-col items-center justify-center w-16 h-full transition-all duration-200 cursor-pointer",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className={clsx(
                    "absolute top-1.5 h-8 w-12 rounded-full transition-all duration-300",
                    isActive ? "bg-primary/10 scale-100" : "scale-75 opacity-0"
                  )}
                />
                <Icon
                  className={clsx("w-5 h-5 relative", isActive && "fill-primary/15")}
                  strokeWidth={isActive ? 2.4 : 2}
                />
                <span className={clsx(
                  "text-[10px] relative",
                  isActive ? "font-semibold" : "font-medium"
                )}>
                  {label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
