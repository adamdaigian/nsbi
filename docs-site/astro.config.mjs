import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  integrations: [
    starlight({
      title: "nsbi",
      description: "BI as Code — write MDX, query SQL, see dashboards",
      social: {
        github: "https://github.com/nsbi/nsbi",
      },
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Installation", slug: "installation" },
            { label: "Quick Start", slug: "getting-started" },
          ],
        },
        {
          label: "Concepts",
          items: [
            { label: "Pages", slug: "concepts/pages" },
            { label: "Queries", slug: "concepts/queries" },
            { label: "Filters", slug: "concepts/filters" },
          ],
        },
        {
          label: "Components",
          autogenerate: { directory: "components" },
        },
        {
          label: "Deployment",
          items: [
            { label: "GitHub Pages", slug: "deployment/github-pages" },
            { label: "Vercel", slug: "deployment/vercel" },
            { label: "Netlify", slug: "deployment/netlify" },
          ],
        },
        {
          label: "API Reference",
          items: [
            { label: "CLI", slug: "api/cli" },
            { label: "Configuration", slug: "api/config" },
          ],
        },
      ],
    }),
  ],
});
