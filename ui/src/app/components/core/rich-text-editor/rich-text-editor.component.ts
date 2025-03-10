import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  ViewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { NGXLogger } from 'ngx-logger';
import { htmlToMarkdown } from 'src/app/utils/html.utils';
import {
  markdownToHtml,
  MarkdownToHtmlOptions,
} from 'src/app/utils/markdown.utils';
import type { Level as HeadingLevel } from '@tiptap/extension-heading';
import { CdkMenuModule } from '@angular/cdk/menu';
import { NgClass, NgIf } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroChevronDown,
  heroBold,
  heroItalic,
} from '@ng-icons/heroicons/outline';
import { MatTooltipModule } from '@angular/material/tooltip';

type OnChangeCallback = (md: string) => void;
type OnTouchedCallback = () => void;

@Component({
  selector: 'app-rich-text-editor',
  templateUrl: './rich-text-editor.component.html',
  styleUrls: ['./rich-text-editor.component.scss'],
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: RichTextEditorComponent,
    },
  ],
  imports: [CdkMenuModule, NgClass, NgIf, NgIcon, MatTooltipModule],
  viewProviders: [provideIcons({ heroChevronDown, heroItalic, heroBold })],
})
export class RichTextEditorComponent
  implements AfterViewInit, ControlValueAccessor, OnChanges
{
  toolbarButtonClass =
    'flex items-center justify-center rounded-md text-sm font-medium transition-colors text-slate-900 hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-slate-100 data-[state=on]:text-slate-900 bg-transparent p-0';
  headingMenuItemClass = `${this.toolbarButtonClass} px-2 py-1.5`;

  @ViewChild('richTextEditor', { read: ElementRef }) editorElement!: ElementRef;

  @Input('editable') editable = true;
  @Input('content') content = '## Hello There?';
  @Input('mode') mode: 'edit' | 'view' = 'edit';
  @Input('editorClass') editorClass = '';
  @Input('maxChars') maxChars: number | undefined = undefined;

  editor: Editor | null = null;
  touched = false;

  // default callbacks
  @Output('change') onChange = new EventEmitter<string>();
  @Output('touch') onTouched = new EventEmitter();

  constructor(private logger: NGXLogger) {}

  ngAfterViewInit(): void {
    this.setupEditor();
  }

  ngOnChanges(): void {
    if (this.editor) {
      this.editor.setEditable(this.editable);
    }
  }

  private async setupEditor() {
    let options = {};

    if (this.mode == 'view') {
      options = {
        maxChars: this.maxChars,
      };
    }

    let initialContent = await this.safeGetHtmlFromMarkdown(
      this.content,
      options,
    );

    this.editor = new Editor({
      element: this.editorElement.nativeElement,
      extensions: [StarterKit],
      content: initialContent,
      editorProps: {
        attributes: {
          class: `${
            this.mode === 'edit'
              ? 'p-2.5 focus-visible:outline-none prose-secondary-edit'
              : ''
          } rounded-lg disabled:bg-secondary-100 max-w-none prose prose-sm prose-p:m-0 prose-p:mb-[0.625rem] prose-li:m-0 ${this.editorClass}`,
        },
      },
      onUpdate: async ({ editor }) => {
        this.markAsTouched();
        const parseResponse = await this.safeGetMarkdownFromHtml(
          editor.getHTML(),
        );
        this.content = parseResponse as string;
        this.onChange.emit(parseResponse as string);
      },
      editable: this.mode == 'edit' ? this.editable : false,
    });
  }

  toggleBold() {
    console.log(this.editor);
    this.editor?.chain().focus().toggleBold().run();
  }

  toggleItalic() {
    this.editor?.chain().focus().toggleItalic().run();
  }

  setHeadingLevel(level?: HeadingLevel) {
    if (level) {
      this.editor?.chain().focus().toggleHeading({ level }).run();
    } else {
      this.editor?.chain().focus().setParagraph().run();
    }
  }

  markAsTouched() {
    if (!this.touched) {
      this.onTouched.emit();
      this.touched = true;
    }
  }

  // ControlValueAccessor methods

  writeValue(markdown: string): void {
    if (this.editor) {
      this.safeGetHtmlFromMarkdown(markdown).then((content) => {
        console.log(content, this.editor);
        this.editor?.commands.setContent(content);
      });
    } else {
      this.content = markdown;
    }
  }

  registerOnChange(fn: OnChangeCallback): void {
    this.onChange.subscribe((value) => {
      fn(value);
    });
  }

  registerOnTouched(fn: OnTouchedCallback): void {
    this.onTouched.subscribe(() => {
      fn();
    });
  }

  setDisabledState?(isDisabled: boolean): void {
    this.editable = !isDisabled;
    console.log(this.editable, 'setDisabledState');
  }

  private async safeGetHtmlFromMarkdown(
    md: string,
    options?: MarkdownToHtmlOptions,
  ) {
    try {
      const response = await markdownToHtml(md, options);
      return response.value;
    } catch (error) {
      this.logger.error('Error', error);
    }

    return '';
  }

  private async safeGetMarkdownFromHtml(html: string) {
    try {
      const response = await htmlToMarkdown(html);
      return response.value;
    } catch (error) {
      this.logger.error('Error', error);
    }

    return '';
  }
}
