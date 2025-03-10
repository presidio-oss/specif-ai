import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
// @ts-expect-error - this package doesn't have ts types
import rehypeTruncate from 'rehype-truncate';
import { unified } from 'unified';

export type MarkdownToHtmlOptions = {
  maxChars?: number;
};

const markdownToHtml = async (md: string, options: MarkdownToHtmlOptions = {}) => {
  const { maxChars } = options;

  const html = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(
      rehypeTruncate,
      {
        disable: maxChars == undefined || maxChars == null,
        maxChars: maxChars,
      }
    )
    .use(rehypeStringify)
    .process(md);

  return html;
};

export { markdownToHtml };
