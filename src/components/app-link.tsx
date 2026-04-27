import type { AnchorHTMLAttributes, ReactNode } from "react";
import { forwardRef, useCallback } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getProjectBySlugs, getProjectColumns } from "@/lib/api";
import { projectKeys } from "@/lib/hooks/use-project";

type AppLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children?: ReactNode;
  prefetch?: boolean;
  replace?: boolean;
};

function isExternalHref(href: string) {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  );
}

const AppLink = forwardRef<HTMLAnchorElement, AppLinkProps>(function AppLink(
  { href, children, prefetch = true, replace, onPointerEnter, onFocus, ...props },
  ref,
) {
  const queryClient = useQueryClient();
  const prefetchTarget = useCallback(() => {
    if (!prefetch || isExternalHref(href)) {
      return;
    }

    void prefetchRouteModule(href).catch(() => undefined);

    const projectRoute = parseProjectRoute(href);
    if (projectRoute) {
      void queryClient.prefetchQuery({
        queryKey: projectKeys.detailBySlugs(projectRoute.teamSlug, projectRoute.projectSlug),
        queryFn: async () => {
          const project = await getProjectBySlugs(projectRoute.teamSlug, projectRoute.projectSlug);
          void queryClient.prefetchQuery({
            queryKey: projectKeys.columns(project.id),
            queryFn: () => getProjectColumns(project.id),
            staleTime: 60_000,
          });
          return project;
        },
        staleTime: 60_000,
      });
    }
  }, [href, prefetch, queryClient]);

  if (isExternalHref(href)) {
    return (
      <a ref={ref} href={href} {...props}>
        {children}
      </a>
    );
  }

  return (
    <RouterLink
      ref={ref}
      to={href}
      replace={replace}
      onPointerEnter={(event) => {
        prefetchTarget();
        onPointerEnter?.(event);
      }}
      onFocus={(event) => {
        prefetchTarget();
        onFocus?.(event);
      }}
      {...props}
    >
      {children}
    </RouterLink>
  );
});

export default AppLink;

function parseProjectRoute(href: string) {
  const pathname = href.split("?")[0]?.replace(/^\/+/, "") || "";
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length !== 2) {
    return null;
  }

  if (["admin", "dashboard", "login", "register", "my-tasks", "notifications", "offline"].includes(segments[0])) {
    return null;
  }

  if (["activity", "members", "settings"].includes(segments[1])) {
    return null;
  }

  return { teamSlug: segments[0], projectSlug: segments[1] };
}

function prefetchRouteModule(href: string) {
  const pathname = href.split("?")[0] || href;

  if (parseProjectRoute(pathname)) {
    return import("@/app/[teamSlug]/[projectSlug]/page");
  }

  if (pathname === "/dashboard" || pathname === "/my-tasks") return Promise.resolve();
  if (pathname === "/notifications") return import("@/app/notifications/page");
  if (pathname.startsWith("/admin/users")) return import("@/app/admin/users/page");
  if (pathname.startsWith("/admin/teams")) return import("@/app/admin/teams/page");
  if (pathname.startsWith("/admin/revenue")) return import("@/app/admin/revenue/page");
  if (pathname.startsWith("/admin/payments")) return import("@/app/admin/payments/page");
  if (pathname.startsWith("/admin/plans")) return import("@/app/admin/plans/page");
  if (pathname === "/admin") return import("@/app/admin/page");

  return Promise.resolve();
}
