import type { MetadataRoute } from "next";

/** Everything may be read by a crawler except the API. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" } };
}
