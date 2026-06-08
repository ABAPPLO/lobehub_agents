import { BRANDING_NAME, ORG_NAME } from '@lobechat/business-const';
import { OG_URL } from '@lobechat/const';

import { getServerFeatureFlagsValue } from '@/config/featureFlags';
import { OFFICIAL_URL } from '@/const/url';
import { isCustomORG, isDesktop } from '@/const/version';
import { appEnv } from '@/envs/app';
import { fileEnv } from '@/envs/file';
import { pythonEnv } from '@/envs/python';
import { type Locales } from '@/locales/resources';
import { getServerGlobalConfig } from '@/server/globalConfig';
import { buildAnalyticsConfig, fetchViteDevTemplate, renderSpaHtml } from '@/server/spaHtml';
import { translation } from '@/server/translation';
import { type SPAClientEnv, type SPAServerConfig } from '@/types/spaServerConfig';
import { RouteVariants } from '@/utils/server/routeVariants';

export function generateStaticParams() {
  const mobileOptions = isDesktop ? [false] : [true, false];
  const staticLocales: Locales[] = ['en-US', 'zh-CN'];

  const variants: { variants: string }[] = [];

  for (const locale of staticLocales) {
    for (const isMobile of mobileOptions) {
      variants.push({
        variants: RouteVariants.serializeVariants({ isMobile, locale }),
      });
    }
  }

  return variants;
}

const isDev = process.env.NODE_ENV === 'development';
const VITE_DEV_ORIGIN = process.env.VITE_DEV_ORIGIN || 'http://localhost:9876';

async function rewriteViteAssetUrls(html: string): Promise<string> {
  const { parseHTML } = await import('linkedom');
  const { document } = parseHTML(html);

  document.querySelectorAll('script[src]').forEach((el: Element) => {
    const src = el.getAttribute('src');
    if (src && src.startsWith('/')) {
      el.setAttribute('src', `${VITE_DEV_ORIGIN}${src}`);
    }
  });

  document.querySelectorAll('link[href]').forEach((el: Element) => {
    const href = el.getAttribute('href');
    if (href && href.startsWith('/')) {
      el.setAttribute('href', `${VITE_DEV_ORIGIN}${href}`);
    }
  });

  document.querySelectorAll('script[type="module"]:not([src])').forEach((el: Element) => {
    const text = el.textContent || '';
    if (text.includes('/@')) {
      el.textContent = text.replaceAll(
        /from\s+["'](\/[@\w].*?)["']/g,
        (_match: string, p: string) => `from "${VITE_DEV_ORIGIN}${p}"`,
      );
    }
  });

  const workerPatch = document.createElement('script');
  workerPatch.textContent = `(function(){
var O=globalThis.Worker;
globalThis.Worker=function(u,o){
var h=typeof u==='string'?u:u instanceof URL?u.href:'';
if(h.startsWith('${VITE_DEV_ORIGIN}')){
var b=new Blob(['import "'+h+'";'],{type:'application/javascript'});
return new O(URL.createObjectURL(b),Object.assign({},o,{type:'module'}));
}return new O(u,o)};
globalThis.Worker.prototype=O.prototype;
})();`;
  const head = document.querySelector('head');
  if (head?.firstChild) {
    head.insertBefore(workerPatch, head.firstChild);
  }

  return document.toString();
}

async function getTemplate(isMobile: boolean): Promise<string> {
  if (isDev) return fetchViteDevTemplate();

  const { desktopHtmlTemplate, mobileHtmlTemplate } = await import('./spaHtmlTemplates');

  return isMobile ? mobileHtmlTemplate : desktopHtmlTemplate;
}

function buildClientEnv(): SPAClientEnv {
  return {
    marketBaseUrl: appEnv.MARKET_BASE_URL,
    pyodideIndexUrl: pythonEnv.NEXT_PUBLIC_PYODIDE_INDEX_URL,
    pyodidePipIndexUrl: pythonEnv.NEXT_PUBLIC_PYODIDE_PIP_INDEX_URL,
    s3FilePath: fileEnv.NEXT_PUBLIC_S3_FILE_PATH,
  };
}

async function buildSeoMeta(locale: string): Promise<string> {
  const { t } = await translation('metadata', locale);
  const title = t('chat.title', { appName: BRANDING_NAME });
  const description = t('chat.description', { appName: BRANDING_NAME });

  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${OFFICIAL_URL}" />`,
    `<meta property="og:image" content="${OG_URL}" />`,
    `<meta property="og:site_name" content="${BRANDING_NAME}" />`,
    `<meta property="og:locale" content="${locale}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${OG_URL}" />`,
    `<meta name="twitter:site" content="${isCustomORG ? `@${ORG_NAME}` : '@lobehub'}" />`,
  ].join('\n    ');
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path?: string[]; variants: string }> },
) {
  const { variants } = await params;
  const { locale, isMobile } = RouteVariants.deserializeVariants(variants);

  const spaConfig: SPAServerConfig = {
    analyticsConfig: buildAnalyticsConfig({ desktop: true }),
    clientEnv: buildClientEnv(),
    config: await getServerGlobalConfig(),
    featureFlags: getServerFeatureFlagsValue(),
    isMobile,
  };

  const template = await getTemplate(isMobile);
  const seoMeta = await buildSeoMeta(locale);

  return renderSpaHtml(template, { seoMeta, serverConfig: spaConfig });
}
