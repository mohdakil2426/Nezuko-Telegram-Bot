"use client";

/**
 * User Navigation Component
 * Displays InsForge user avatar and dropdown menu with logout functionality.
 */

import { useState } from "react";
import { LogOut, Settings, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUser } from "@insforge/nextjs";
import { useAuth } from "@/lib/hooks/use-auth";
import { insforge } from "@/lib/insforge";
import { DEV_LOGIN } from "@/lib/api/config";

interface NavUserProps {
  /** Fallback user info (used if not authenticated) */
  user?: {
    name: string;
    email: string;
    avatar: string;
  };
}

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function NavUser({ user: fallbackUser }: NavUserProps) {
  const { isMobile } = useSidebar();
  const { isSignedIn, isLoaded } = useAuth();
  const { user: insforgeUser } = useUser();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await insforge.auth.signOut();
      toast.success("Signed out successfully");
      router.push("/login");
    } catch (err) {
      toast.error("Failed to sign out. Please try again.");
      console.error("[handleSignOut]", err);
    } finally {
      setIsSigningOut(false);
    }
  };

  // Build display user from InsForge profile.
  // In dev mode there is no session, so show a clear dev-mode label.
  const displayUser = insforgeUser
    ? {
        name: insforgeUser.profile?.name || insforgeUser.email || "Bot Owner",
        email: insforgeUser.email || "",
        avatar: insforgeUser.profile?.avatar_url || "",
      }
    : DEV_LOGIN
      ? { name: "Dev Mode", email: "auth bypassed", avatar: "" }
      : fallbackUser || { name: "Bot Owner", email: "Not signed in", avatar: "" };

  const isPending = !isLoaded;


  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              aria-label={`Open user menu for ${displayUser.name}`}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={displayUser.avatar} alt={displayUser.name} />
                <AvatarFallback className="rounded-lg">
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    getInitials(displayUser.name)
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayUser.name}</span>
                <span className="text-muted-foreground truncate text-xs">{displayUser.email}</span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={displayUser.avatar} alt={displayUser.name} />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(displayUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayUser.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {displayUser.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">
                  <Settings />
                  Settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {isSignedIn ? (
              <DropdownMenuItem
                variant="destructive"
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <LogOut />
                )}
                {isSigningOut ? "Signing out…" : "Log out"}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled>
                <LogOut />
                Not signed in
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
