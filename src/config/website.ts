import type { Image, NavItem } from '@/shared/types/blocks/common';
import type { Sidebar } from '@/shared/types/blocks/dashboard';
import type { Footer, Header } from '@/shared/types/blocks/landing';

import { envConfigs } from '.';

type SocialLink = NavItem & {
  /** Only shown when true at call sites. */
  enabled: boolean;
};

const socialLinks: SocialLink[] = [
  {
    title: 'X',
    icon: 'RiTwitterXFill',
    url: 'https://x.com/your-app-name',
    target: '_blank',
    enabled: false,
  },
  {
    title: 'GitHub',
    icon: 'Github',
    url: 'https://github.com/your-app-name',
    target: '_blank',
    enabled: false,
  },
  {
    title: 'Discord',
    icon: 'RiDiscordFill',
    url: 'https://discord.gg/your-app-name',
    target: '_blank',
    enabled: false,
  },
  {
    title: 'Email',
    icon: 'Mail',
    url: 'mailto:support@spritepixel.com',
    target: '_self',
    enabled: true,
  },
];

function getEnabledSocialLinks(): NavItem[] {
  return socialLinks.filter((link) => link.enabled);
}

export const websiteConfig = {
  // Set to false for websites that do not need user accounts.
  auth: {
    enabled: true,
  },
  brand: {
    title: envConfigs.app_name,
    logo: {
      src: envConfigs.app_logo,
      alt: envConfigs.app_name,
    },
  },
  socialLinks,
  layout: {
    landing: {
      header: {
        showSign: true,
        showTheme: false,
        showLocale: true,
      },
      footer: {
        showTheme: false,
        showLocale: true,
      },
    },
    dashboard: {
      showTrigger: false,
      showUser: true,
      showEmail: true,
      showSignOut: true,
      signOutCallback: '/',
      signInCallback: '/dashboard',
      showTheme: false,
      showLocale: false,
      variant: 'sidebar' as const,
    },
    admin: {
      showTrigger: false,
      showUser: true,
      showEmail: false,
      showSignOut: true,
      signOutCallback: '/',
      showTheme: false,
      showLocale: false,
      variant: 'sidebar' as const,
    },
    chat: {
      showTrigger: false,
      showUser: true,
      showEmail: false,
      showSignOut: true,
      signOutCallback: '/chat',
      signInCallback: '/chat',
      showTheme: true,
      showLocale: false,
      variant: 'sidebar' as const,
    },
  },
} as const;

function getBrandLogo(overrides?: Partial<Image>): Image {
  return {
    ...websiteConfig.brand.logo,
    ...overrides,
  };
}

export function applyLandingWebsiteConfig(
  localizedHeader: Header,
  localizedFooter: Footer
): { header: Header; footer: Footer } {
  const landingConfig = websiteConfig.layout.landing;

  return {
    header: {
      ...localizedHeader,
      brand: {
        ...localizedHeader.brand,
        title: websiteConfig.brand.title,
        logo: getBrandLogo({ width: 100, height: 100 }),
        url: '/',
      },
      show_sign: websiteConfig.auth.enabled && landingConfig.header.showSign,
      show_theme: landingConfig.header.showTheme,
      show_locale: landingConfig.header.showLocale,
    },
    footer: {
      ...localizedFooter,
      brand: {
        ...localizedFooter.brand,
        title: websiteConfig.brand.title,
        logo: getBrandLogo({ width: 1024, height: 1024 }),
        url: '/',
      },
      social: {
        items: getEnabledSocialLinks(),
      },
      show_theme: landingConfig.footer.showTheme,
      show_locale: landingConfig.footer.showLocale,
    },
  };
}

type SidebarVariant = 'dashboard' | 'admin' | 'chat';

export function applySidebarWebsiteConfig(
  localizedSidebar: Sidebar,
  variant: SidebarVariant
): Sidebar {
  const layoutConfig = websiteConfig.layout[variant];
  const localizedFooterItems = localizedSidebar.footer?.nav?.items ?? [];
  const showUser = websiteConfig.auth.enabled && layoutConfig.showUser;

  return {
    ...localizedSidebar,
    header: {
      ...localizedSidebar.header,
      brand: {
        ...localizedSidebar.header?.brand,
        title: websiteConfig.brand.title,
        logo: getBrandLogo(),
        url:
          variant === 'admin'
            ? '/admin'
            : variant === 'chat'
              ? '/chat'
              : '/',
      },
      show_trigger: layoutConfig.showTrigger,
    },
    user: showUser
      ? {
          ...localizedSidebar.user,
          show_email: layoutConfig.showEmail,
          show_signout: layoutConfig.showSignOut,
          signout_callback: layoutConfig.signOutCallback,
          ...('signInCallback' in layoutConfig
            ? { signin_callback: layoutConfig.signInCallback }
            : {}),
        }
      : undefined,
    footer: {
      ...localizedSidebar.footer,
      nav: {
        ...localizedSidebar.footer?.nav,
        items: [...localizedFooterItems, ...getEnabledSocialLinks()],
      },
      show_theme: layoutConfig.showTheme,
      show_locale: layoutConfig.showLocale,
    },
    variant: layoutConfig.variant,
  };
}
