export const formatDate = (date: Date, locale: string = 'ko-KR') =>
  date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  });
