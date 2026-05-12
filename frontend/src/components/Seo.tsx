import { Helmet } from 'react-helmet-async';

interface Props {
  title: string;
  description?: string;
  /** Open Graph image (absolute URL). Default: brand image. */
  image?: string;
  /** Path bez domeny — używamy do canonical i og:url. */
  path?: string;
  /** "article" dla kursów / lekcji; "website" dla landing. */
  type?: 'website' | 'article';
}

const SITE_NAME = 'Kursy.pl';
const DEFAULT_DESCRIPTION =
  'Polska platforma do interaktywnej nauki kodowania. Python, JavaScript, AI mentor po polsku.';

export default function Seo({ title, description, image, path, type = 'website' }: Props) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`;
  const desc = description || DEFAULT_DESCRIPTION;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = path ? origin + path : origin + (typeof window !== 'undefined' ? window.location.pathname : '');
  const img = image || origin + '/icon-512.png';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />
      <meta property="og:locale" content="pl_PL" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
    </Helmet>
  );
}
