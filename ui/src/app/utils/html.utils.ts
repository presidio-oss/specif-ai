import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import remarkGfm from 'remark-gfm'; 

const htmlToMarkdown = async (html: string) => {
  const t = performance.now();

  const md = await unified()
    .use(rehypeParse)
    .use(rehypeRemark)
    .use(remarkGfm) 
    .use(remarkStringify)
    .process(html);

  console.debug(`html to markdown tool ${performance.now() - t}ms`);

  return md.value;
};

export { htmlToMarkdown };
