"use client";

import { useUsage } from "@/lib/hooks/use-billing";
import Link from "@/components/app-link";
import { Zap } from "lucide-react";
import { isPaidSubscription } from "@/lib/billing";
import { useStore } from "@/lib/store";

export function SidebarUsageIndicator({ teamId }: { teamId: string }) {
    const { data: usage } = useUsage(teamId);
    const team = useStore(state => state.currentTeam);
    const user = useStore(state => state.user);

    if (!usage || !team) return null;
    if (!user || team.owner_id !== user.id) return null;

    // Don't show if Pro? Or show reduced?
    // If Pro (Unlimited), maybe show Storage or AI?
    // If Free, show Projects or Members limit which is strict.

    // Check if Free Plan
    const isFree = !isPaidSubscription(team.subscription?.status);

    if (!isFree) return null; // Hide for Pro for clean look? Or maybe specific Pro stats later.

    // Calculate percentage of Projects (limit 2)
    const maxProjects = Math.max(usage.plan?.max_projects || 1, 1);
    const projectsPercent = Math.min((usage.projects_count / maxProjects) * 100, 100);

    return (
        <div className="bg-muted/50 rounded-lg p-3 space-y-3 border border-border">
            <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-muted-foreground">{usage.plan?.name || "Current Plan"}</span>
                <Link prefetch={false} href={`/${team.slug}/settings?plans=1`} className="text-primary hover:underline">Upgrade</Link>
            </div>

            <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Projects</span>
                    <span>{usage.projects_count} / {maxProjects}</span>
                </div>
                {/* Custom Progress Component if shadcn not present or minimal */}
                <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${projectsPercent}%` }} />
                </div>
            </div>

            {/* Upgrade Banner Button */}
            <Link prefetch={false} href={`/${team.slug}/settings?plans=1`} className="block w-full text-center bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold py-1.5 rounded transition-colors flex items-center justify-center gap-1">
                <Zap className="w-3 h-3 fill-current" />
                Upgrade Plan
            </Link>
        </div>
    );
}
