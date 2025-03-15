import markdownit from 'markdown-it';
const mdit = markdownit();
// @ts-expect-error no types
import truncateMarkdownLib from 'markdown-truncate';

export type MarkdownToHtmlOptions = {
  maxChars?: number;
};

const markdownToHtml = (
  mdInput: string,
  options: MarkdownToHtmlOptions = {},
) => {
  try {
    const { maxChars } = options;
    let md = mdInput;

    if (maxChars) {
      md = truncateMarkdown(mdInput, { maxChars: maxChars, ellipsis: true });
    }
    const html = mdit.render(md ?? '');
    return html;
  } catch (error) {
    console.error(error);
    return '';
  }
};

const truncateMarkdown = (
  md: string,
  { maxChars, ellipsis = true }: { maxChars: number; ellipsis?: boolean },
) => {
  return truncateMarkdownLib(md, {
    limit: maxChars,
    ellipsis,
  });
};

export { markdownToHtml, truncateMarkdown };
