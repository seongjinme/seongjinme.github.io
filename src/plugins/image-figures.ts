import type { SatteriResolvedOptions } from '@astrojs/markdown-satteri';
import type { AstroIntegration } from 'astro';
import type { HastNode, HastPluginDefinition, HastVisitorContext } from 'satteri';

type Element = Extract<HastNode, { type: 'element' }>;

export const imageFiguresPlugin: HastPluginDefinition = {
  name: 'image-figures',
  element: {
    filter: ['p'],
    visit(node, ctx) {
      if (node.children.length !== 1) return;

      const content = node.children[0];
      const image = getStandaloneImage(content);
      if (!image) return;

      if (hasFigureAncestor(node, ctx)) return;

      const caption = String(image.properties.title ?? image.properties.alt ?? '');
      ctx.replaceNode(node, createFigure(content, caption));
    },
  },
};

export default function imageFigures(): AstroIntegration {
  return {
    name: 'image-figures',
    hooks: {
      'astro:config:setup': ({ config }) => {
        const processor = config.markdown.processor;
        if (processor.name !== 'satteri') {
          throw new Error('image-figures requires the Sätteri Markdown processor.');
        }

        const options = processor.options as SatteriResolvedOptions;
        options.hastPlugins.push(imageFiguresPlugin);
      },
    },
  };
}

function getStandaloneImage(content: Element['children'][number]): Element | undefined {
  if (content.type !== 'element') return;
  if (content.tagName === 'img') return content;
  if (content.tagName !== 'a' || content.children.length !== 1) return;

  const child = content.children[0];

  if (child.type === 'element' && child.tagName === 'img') return child;
}

function hasFigureAncestor(node: Readonly<Element>, ctx: HastVisitorContext): boolean {
  let parent: Readonly<HastNode> | undefined = ctx.parent(node);
  while (parent) {
    if (parent.type === 'element' && parent.tagName === 'figure') return true;
    parent = ctx.parent(parent);
  }

  return false;
}

function createFigure(content: Element['children'][number], caption: string): Element {
  const figure: Element = {
    type: 'element',
    tagName: 'figure',
    properties: {},
    children: [content],
  };

  if (caption.trim()) {
    figure.children.push({
      type: 'element',
      tagName: 'figcaption',
      properties: {},
      children: [{ type: 'text', value: caption }],
    });
  }

  return figure;
}
