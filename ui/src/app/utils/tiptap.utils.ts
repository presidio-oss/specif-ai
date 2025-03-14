import Bold from '@tiptap/extension-bold';
import BulletList from '@tiptap/extension-bullet-list';
import Document from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import Heading from '@tiptap/extension-heading';
import { History } from '@tiptap/extension-history';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Italic from '@tiptap/extension-italic';
import ListItem from '@tiptap/extension-list-item';
import ListKeyMap from '@tiptap/extension-list-keymap';
import OrderedList from '@tiptap/extension-ordered-list';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';

const TiptapExtensions = [
  Document,
  Paragraph,
  Text,
  BulletList,
  ListItem,
  HardBreak,
  Heading,
  HorizontalRule,
  OrderedList,
  Bold,
  Italic,
  ListKeyMap,
  History
];

export { TiptapExtensions };
