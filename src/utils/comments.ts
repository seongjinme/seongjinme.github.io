export const commentsRepository = {
  name: 'seongjinme/blog-comments',
  id: 'R_kgDOGqD13Q',
  category: 'Announcements',
  categoryId: 'DIC_kwDOGqD13c4CAt4J',
};

type Discussion = { number: number; additional?: number[] } | { term: string };

export const articleDiscussions: Record<string, Discussion> = {
  'building-news-bot-with-google-apps-script': { number: 22, additional: [8] },
  'docker-swarm-introduction-nodes': { number: 11 },
  'docker-swarm-services': { number: 12 },
  'environment-variables-in-docker-compose': { number: 26 },
  'experiment-of-creating-web-app-with-chatgpt': { number: 21 },
  'function-calling-with-json-output-in-gpt-models': { number: 24 },
  'how-to-build-ghost-blog-with-docker-compose': { number: 19 },
  'how-to-build-ghost-blog-with-docker': { number: 7 },
  'how-to-contribute-to-open-source': { number: 6 },
  'how-to-use-docker-secret-to-environment-variables': { number: 14 },
  'how-to-use-jsonpath-in-kubernetes': { number: 15 },
  'kubernetes-cluster-components': { number: 4 },
  'kubernetes-core-concepts': { number: 18 },
  'kubernetes-imparative-vs-declarative': { number: 16 },
  'kubernetes-multi-container-pod-design-patterns': { number: 17 },
  'kubernetes-pods': { number: 27 },
  'kubernetes-service-types': { number: 25 },
  'prompt-engineering-in-chatgpt': { number: 20 },
  'raft-consensus-algorithm': { number: 23 },
  'reasons-to-choose-ghost-cms': { number: 13 },
  'reflection-2025': { number: 31 },
  'retrospect-2021': { number: 5 },
  'retrospect-2023': { number: 28 },
  'retrospect-2024': { number: 30 },
  'upgrade-to-ghost-v5-with-mysql-8-in-docker-compose': { number: 10 },
  'using-openai-api-as-a-content-generator': { number: 29 },
};

export function articleComments(slug: string) {
  const discussion = articleDiscussions[slug];

  if (discussion && 'number' in discussion) {
    return {
      mapping: 'number',
      term: String(discussion.number),
      url: `https://github.com/${commentsRepository.name}/discussions/${discussion.number}`,
      additional: discussion.additional ?? [],
    };
  }

  return {
    mapping: 'specific',
    term: discussion?.term ?? `/${slug}/`,
    url: `https://github.com/${commentsRepository.name}/discussions`,
    additional: [],
  };
}
