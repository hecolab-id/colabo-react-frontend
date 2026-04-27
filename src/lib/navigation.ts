import { useMemo } from "react";
import {
  useLocation,
  useNavigate,
  useParams as useRouterParams,
  useSearchParams as useRouterSearchParams,
} from "react-router-dom";

type NavigateOptions = {
  scroll?: boolean;
};

export function useRouter() {
  const navigate = useNavigate();

  return useMemo(
    () => ({
      push: (href: string, _options?: NavigateOptions) => navigate(href),
      replace: (href: string, _options?: NavigateOptions) =>
        navigate(href, { replace: true }),
      prefetch: async (_href: string) => undefined,
      refresh: () => window.location.reload(),
      back: () => navigate(-1),
      forward: () => window.history.forward(),
    }),
    [navigate],
  );
}

export function usePathname() {
  return useLocation().pathname;
}

export function useSearchParams() {
  const [params] = useRouterSearchParams();
  return params;
}

export function useParams<
  T extends Record<string, string | undefined> = Record<string, string | undefined>,
>() {
  return useRouterParams() as T;
}

export function redirect(href: string): never {
  if (typeof window !== "undefined") {
    window.location.replace(href);
  }

  throw new Error(`Redirected to ${href}`);
}
