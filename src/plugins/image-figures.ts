import type { RehypePlugin } from '@astrojs/markdown-remark';
import type { Element, Root } from 'hast';

const imageFigures: RehypePlugin = () => (tree) => {
  visit(tree, false);
};

export default imageFigures;

function visit(parent: Root | Element, inFigure: boolean): void {
  for (const [index, node] of parent.children.entries()) {
    if (node.type !== 'element') continue;

    if (!inFigure && node.tagName === 'p' && node.children.length === 1) {
      const content = node.children[0];
      const image = getStandaloneImage(content);

      if (image && content.type === 'element') {
        const caption = String(image.properties.title ?? image.properties.alt ?? '');
        parent.children[index] = createFigure(content, caption);
        continue;
      }
    }

    visit(node, inFigure || node.tagName === 'figure');
  }
}

function getStandaloneImage(content: Element['children'][number]): Element | undefined {
  if (content.type !== 'element') return;
  if (content.tagName === 'img') return content;
  if (content.tagName !== 'a' || content.children.length !== 1) return;

  const child = content.children[0];

  if (child.type === 'element' && child.tagName === 'img') return child;
}

function createFigure(content: Element, caption: string): Element {
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
