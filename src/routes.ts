export type AppRoute =
  | { name: "home" }
  | { name: "episodes" }
  | { name: "episode"; slug: string }
  | { name: "subscribe" }
  | { name: "about" }
  | { name: "sitemap" }
  | { name: "robots" }
  | { name: "notfound" };

const APEX_HOSTS = new Set(["thenotoriouscast.com"]);

export function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.replace(/\/+$/, "") || "/";
  }
  return pathname || "/";
}

export function apexRedirectLocation(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (!APEX_HOSTS.has(host)) return null;
  const next = new URL(url.toString());
  next.hostname = "www.thenotoriouscast.com";
  next.protocol = "https:";
  return next.toString();
}

export function parseRoute(pathname: string): AppRoute {
  const path = normalizePath(pathname);
  if (path === "/") return { name: "home" };
  if (path === "/episodes") return { name: "episodes" };
  if (path === "/subscribe") return { name: "subscribe" };
  if (path === "/about") return { name: "about" };
  if (path === "/sitemap.xml") return { name: "sitemap" };
  if (path === "/robots.txt") return { name: "robots" };

  const episode = path.match(/^\/episodes\/([^/]+)$/);
  if (episode) return { name: "episode", slug: decodeURIComponent(episode[1]) };

  return { name: "notfound" };
}

export function trailingSlashLocation(url: URL): string | null {
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    const next = new URL(url.toString());
    next.pathname = normalizePath(url.pathname);
    return next.toString();
  }
  return null;
}
