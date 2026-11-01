export type Locale = 'ko' | 'en';
export type Alternates = Partial<Record<Locale, string>>;

export const ui = {
  ko: {
    articles: 'Articles',
    allArticles: (count: number) => `전체 글 ${count}개 보기 →`,
    profileIntro: '베를린에서 소프트웨어 엔지니어로 일합니다.',
    profileBody:
      '웹 서비스를 주로 만듭니다. 사용하기 편한 제품, 비즈니스에 실질적인 가치를 더하는 제품 개발을 중시합니다. 만든 소프트웨어가 실제 환경에서 어떻게 동작하는지, 얼마나 잘 작동하는지, 또 무엇을 개선할 수 있을지 꾸준히 고민합니다.',
    selection: '',
    languageLabel: '언어 선택',
    dateLocale: 'ko-KR',
  },
  en: {
    articles: 'Articles',
    allArticles: (count: number) => `View all ${count} ${count === 1 ? 'article' : 'articles'} →`,
    profileIntro: 'Software Engineer based in Berlin.',
    profileBody:
      'I build web products. Focusing on making things easy to use and creating business impact. Always care about software in production: how it behaves, how it performs, and how we can make it better.',
    selection: 'Selected articles translated from Korean.',
    languageLabel: 'Choose language',
    dateLocale: 'en-US',
  },
};

export function localeUrl(locale: Locale, slug = '') {
  return `${locale === 'en' ? '/en/' : '/'}${slug ? `${slug}/` : ''}`;
}
