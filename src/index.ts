import {
  renderAbout,
  renderEpisode,
  renderEpisodes,
  renderHome,
  renderNotFound,
  renderRobots,
  renderSitemap,
  renderSubscribe,
  safePodcast,
} from "./pages";
import { apexRedirectLocation, parseRoute, trailingSlashLocation } from "./routes";

const STATIC_FILE = /\.(?:css|js|svg|png|ico|jpg|jpeg|webp|woff2?|txt|map)$/i;

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);

    const apex = apexRedirectLocation(url);
    if (apex) {
      return Response.redirect(apex, 301);
    }

    const slash = trailingSlashLocation(url);
    if (slash) {
      return Response.redirect(slash, 308);
    }

    if (STATIC_FILE.test(url.pathname)) {
      return env.ASSETS.fetch(request);
    }

    const route = parseRoute(url.pathname);
    if (route.name === "robots") {
      return renderRobots(env, url);
    }

    const { podcast, error } = await safePodcast(env, ctx);

    switch (route.name) {
      case "home":
        return renderHome(env, url, podcast, error);
      case "episodes":
        return renderEpisodes(env, url, podcast, error);
      case "episode":
        return renderEpisode(env, ctx, url, podcast, route.slug);
      case "subscribe":
        return renderSubscribe(env, url, podcast);
      case "about":
        return renderAbout(env, url, podcast);
      case "sitemap":
        return renderSitemap(env, url, podcast);
      default:
        return renderNotFound(env, url, podcast);
    }
  },
} satisfies ExportedHandler<Env>;
