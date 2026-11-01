import { getCollection, type CollectionEntry } from 'astro:content';
import { localeUrl, type Locale, type Alternates } from '@/i18n/ui';

type Article = CollectionEntry<'articles'>;

export function articleSlug(article: Article): string {
  return article.data.lang === 'en' ? article.id.replace(/^en\//, '') : article.id;
}

export function articleUrl(article: Article): string {
  return localeUrl(article.data.lang, articleSlug(article));
}

function validateArticles(articles: Article[]): void {
  for (const article of articles) {
    const isInEnglishDirectory = article.id.startsWith('en/');
    const isEnglish = article.data.lang === 'en';

    if (isInEnglishDirectory !== isEnglish) {
      throw new Error(`${article.id}: English articles must be in en/ and declare lang: en`);
    }

    if (isEnglish) {
      const slug = articleSlug(article);
      const hasKoreanVersion = articles.some(
        (candidate) => candidate.data.lang === 'ko' && candidate.id === slug,
      );

      if (!hasKoreanVersion) {
        throw new Error(
          `${article.id}: English articles must share a filename with a Korean version`,
        );
      }
    }
  }
}

function getArticleAlternates(article: Article, articles: Article[]): Alternates {
  const alternates: Alternates = {};
  const slug = articleSlug(article);

  for (const candidate of articles) {
    if (articleSlug(candidate) === slug) {
      alternates[candidate.data.lang] = articleUrl(candidate);
    }
  }

  return alternates;
}

export async function getArticles(): Promise<Article[]> {
  const articles = await getCollection('articles');
  validateArticles(articles);

  return articles.sort(
    (first, second) =>
      second.data.pubDate.valueOf() - first.data.pubDate.valueOf() ||
      first.id.localeCompare(second.id),
  );
}

export async function getLocalizedArticles(locale: Locale) {
  return (await getArticles()).filter((article) => article.data.lang === locale);
}

export async function getArticlePaths(locale: Locale) {
  const articles = await getArticles();

  return articles
    .filter((article) => article.data.lang === locale)
    .map((article) => ({
      params: { slug: articleSlug(article) },
      props: { article, alternates: getArticleAlternates(article, articles) },
    }));
}
