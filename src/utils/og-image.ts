import { resolve } from 'node:path';
import sharp from 'sharp';

const fontfile = resolve('src/assets/fonts/NotoSansKR-DemiLight.otf');
process.env.FONTCONFIG_FILE ??= resolve('src/assets/fonts/fonts.conf');

const imageWidth = 1200;
const imageHeight = 630;
const margin = 96;
const titleAreaHeight = 360;
const titleLetterSpacing = -1024;

const colors = {
  background: '#fafaf9',
  title: '#242424',
  domain: '#626260',
};

function escapeMarkup(text: string): string {
  return text.replace(/[&<>"']/g, (character) => {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;',
    }[character]!;
  });
}

function renderText(text: string, fontSize: number, color: string, letterSpacing = 0) {
  return sharp({
    text: {
      text: `<span foreground="${color}" letter_spacing="${letterSpacing}">${escapeMarkup(text)}</span>`,
      font: `Noto Sans KR DemiLight ${fontSize}`,
      fontfile,
      width: imageWidth - margin * 2,
      wrap: 'word-char',
      spacing: 12,
      rgba: true,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
}

async function renderTitle(title: string) {
  const preferredFontSize = 64;
  const minimumFontSize = 24;

  for (let fontSize = preferredFontSize; fontSize >= minimumFontSize; fontSize -= 2) {
    const titleImage = await renderText(title, fontSize, colors.title, titleLetterSpacing);
    if (titleImage.info.height <= titleAreaHeight) {
      return titleImage;
    }
  }

  throw new Error(`OpenGraph title does not fit: ${title}`);
}

export async function generateOgImage(title: string): Promise<Buffer> {
  const titleImage = await renderTitle(title);
  const domainImage = await renderText('seongjin.me', 28, colors.domain);

  const titleTop = margin + Math.floor((titleAreaHeight - titleImage.info.height) / 2);
  const domainTop = imageHeight - margin - domainImage.info.height;

  return sharp({
    create: {
      width: imageWidth,
      height: imageHeight,
      channels: 3,
      background: colors.background,
    },
  })
    .composite([
      { input: titleImage.data, left: margin, top: titleTop },
      { input: domainImage.data, left: margin, top: domainTop },
    ])
    .png()
    .toBuffer();
}
