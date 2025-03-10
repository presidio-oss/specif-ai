import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

const htmlToMarkdown = async (html: string) => {
  const md = await unified()
    .use(rehypeParse)
    .use(rehypeRemark)
    .use(remarkStringify)
    .process(html);

  return md;
};


export { htmlToMarkdown };
