import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  base: "/docs",
  integrations: [
    starlight({
      title: "Polaris",
      description: "Polaris — BI as Code. Write MDX, query SQL, see dashboards.",
      customCss: ["./src/styles/polaris-theme.css"],
      social: {
        github: "https://github.com/polaris/polaris",
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
