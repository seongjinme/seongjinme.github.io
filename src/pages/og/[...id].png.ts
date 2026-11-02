import type { APIRoute, GetStaticPaths } from 'astro';
import { getArticles, articleSlug } from '@/utils/articles';
import { generateOgImage } from '@/utils/og-image';

export const getStaticPaths = (async () => {
  return (await getArticles())
    .filter((article) => !article.data.featureImage)
    .map((article) => ({
      params: { id: `${article.data.lang}/${articleSlug(article)}` },
      props: { title: article.data.title },
    }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const image = await generateOgImage(props.title);
  return new Response(new Uint8Array(image), {
    headers: { 'Content-Type': 'image/png' },
  });
};
