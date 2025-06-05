// @ts-check
const config = {
  title: 'Specifai',
  tagline: 'Accelerate your SDLC process with AI-powered intelligence.',
  customFields: {
    subTagline: 'From ideas to actionable tasks in minutes.',
  },
  url: 'https://specifai.io',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

  organizationName: 'hai',
  projectName: 'specifai',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      {
        hashed: true,
        indexDocs: true,
        indexBlog: false,
        indexPages: true,
        language: ["en"],
        highlightSearchTermsOnTargetPage: true,
        searchResultLimits: 8,
        searchResultContextMaxLength: 50,
        searchBarShortcut: true,
        fuzzyMatchingDistance: 1,
      },
    ],
  ],

  markdown: {
    mermaid: true,
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/presidio-oss/specif-ai/tree/main/docs/',
          routeBasePath: '/',
          sidebarCollapsible: true,
          sidebarCollapsed: false,
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/styles/global.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/specifai-social-card.jpg',
      navbar: {
        title: '',
        logo: {
          alt: 'Specifai Logo',
          src: 'img/hai-specif-ai-theme.svg',
          srcDark: 'img/hai-specif-ai-light.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docs',
            position: 'left',
            label: 'Documentation',
          },
          {
            href: 'https://github.com/hai/specif-ai',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Documentation',
            items: [
              {
                label: 'Getting Started',
                to: '/current/getting-started',
              },
              {
                label: 'Core Features',
                to: '/current/core-features',
              },
              {
                label: 'Integrations',
                to: '/current/integrations-setup',
              },
              {
                label: 'Advanced Features',
                to: '/current/advanced-features',
              },
              {
                label: 'Troubleshooting',
                to: '/current/troubleshooting',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/hai/specif-ai',
              },
              {
                label: 'Support',
                href: 'mailto:hai-feedback@presidio.com',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Hai, Inc. Built with Docusaurus.`,
      },
      prism: {
        theme: require('prism-react-renderer').themes.github,
        darkTheme: require('prism-react-renderer').themes.dracula,
      },
    }),
};

module.exports = config;
