import { CdkMenuModule } from '@angular/cdk/menu';
import { NgClass, NgIf } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroBold,
  heroChevronDown,
  heroItalic,
  heroListBullet,
  heroNumberedList,
} from '@ng-icons/heroicons/outline';
import { Editor } from '@tiptap/core';
import type { Level as HeadingLevel } from '@tiptap/extension-heading';
import { NGXLogger } from 'ngx-logger';
import { debounce, Subject, Subscription, timer } from 'rxjs';
import { htmlToMarkdown } from 'src/app/utils/html.utils';
import {
  markdownToHtml,
  MarkdownToHtmlOptions,
} from 'src/app/utils/markdown.utils';
import { TiptapExtensions } from 'src/app/utils/tiptap.utils';

// It could be markdown or plain text
type ValueType = string;

type OnChangeCallback = (value: ValueType) => void;
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
    {
      provide: NG_VALIDATORS,
      multi: true,
      useExisting: RichTextEditorComponent,
    },
  ],
  imports: [CdkMenuModule, NgClass, NgIf, NgIcon, MatTooltipModule],
  viewProviders: [provideIcons({ heroChevronDown, heroItalic, heroBold, heroListBullet, heroNumberedList })],
})
export class RichTextEditorComponent
  implements
    AfterViewInit,
    ControlValueAccessor,
    OnChanges,
    OnDestroy,
    Validator
{
  toolbarButtonClass =
    'flex items-center justify-center rounded-md text-sm font-medium transition-colors text-slate-900 hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-slate-100 data-[state=on]:text-slate-900 bg-transparent p-0';
  headingMenuItemClass = `${this.toolbarButtonClass} px-2 py-1.5`;

  @ViewChild('richTextEditor', { read: ElementRef }) editorElement!: ElementRef;

  @Input('editable') editable = true;
  @Input('content') value: ValueType = '';
  @Input('mode') mode: 'edit' | 'view' = 'edit';
  @Input('editorClass') editorClass = '';

  editor: Editor | null = null;
  touched = false;
  private editorUpdate$ = new Subject<string>();
  private changeSubscription?: Subscription;
  private touchedSubscription?: Subscription;

  isEmpty = true;
  isInvalid = false;

  // default callbacks
  @Output('change') onChange = new EventEmitter<ValueType>();
  @Output('touch') onTouched = new EventEmitter();

  constructor(private logger: NGXLogger) {
    this.setupEditorUpdateSubscription();
  }

  ngAfterViewInit(): void {
    this.setupEditor();
  }

  ngOnChanges(): void {
    if (this.editor) {
      if (this.mode === 'view') {
        this.editor.setEditable(false);
      } else {
        this.editor.setEditable(this.editable);
      }

      this.editor.setOptions({
        editorProps: {
          attributes: {
            class: this.getEditorClass(),
          },
        },
      });
    }
  }

  private getEditorClass(): string {
    return `${
      this.mode === 'edit'
        ? 'p-2.5 focus-visible:outline-none prose-secondary-edit'
        : ''
    } rounded-lg disabled:bg-secondary-100 max-w-none prose prose-sm prose-p:m-0 prose-p:mb-[0.625rem] prose-li:m-0 ${this.editorClass}`;
  }

  private async setupEditor() {
    let initialContent = this.safeGetHtmlFromMarkdown(this.value);

    this.editor = new Editor({
      element: this.editorElement.nativeElement,
      extensions: TiptapExtensions,
      content: initialContent,
      editorProps: {
        attributes: {
          class: this.getEditorClass(),
        },
      },
      onUpdate: ({ editor }) => {
        if (this.mode == 'edit') {
          this.markAsTouched();
          this.isEmpty = editor.$doc.textContent.length === 0;
          const newContent = editor.getHTML();
          // Only emit if the content has actually changed
          if (JSON.stringify(this.value) !== JSON.stringify(newContent)) {
            this.value = newContent;
            this.editorUpdate$.next(newContent);
          }
        }
      },
      editable: this.mode == 'edit' ? this.editable : false,
    });

    this.isEmpty = this.editor.$doc.textContent.length === 0;
    this.onChange.emit(this.value);
  }

  toggleBold() {
    this.editor?.chain().focus().toggleBold().run();
  }

  toggleItalic() {
    this.editor?.chain().focus().toggleItalic().run();
  }

  toggleBulletList() {
    this.editor?.chain().focus().toggleBulletList().run();
  }

  toggleOrderedList() {
    this.editor?.chain().focus().toggleOrderedList().run();
  }

  setHeadingLevel(level?: HeadingLevel) {
    if (level) {
      this.editor?.chain().focus().toggleHeading({ level }).run();
    } else {
      this.editor?.chain().focus().setParagraph().run();
    }
  }

  markAsTouched() {
    this.onTouched.emit();
    this.touched = true;
  }

  // ControlValueAccessor methods

  writeValue(value: ValueType): void {
    // Only update if the content has actually changed
    if (this.value !== value) {
      if (this.editor) {
        const html = this.safeGetHtmlFromMarkdown(value);
        this.editor.commands.setContent(html);
      }
      this.value = value;
    }
  }

  registerOnChange(fn: OnChangeCallback): void {
    this.changeSubscription?.unsubscribe();

    this.changeSubscription = this.onChange.subscribe((value) => {
      fn(value);
    });
  }

  registerOnTouched(fn: OnTouchedCallback): void {
    this.touchedSubscription?.unsubscribe();

    this.touchedSubscription = this.onTouched.subscribe(() => {
      fn();
    });
  }

  setDisabledState?(isDisabled: boolean): void {
    this.editable = !isDisabled;
  }

  private setupEditorUpdateSubscription() {
    this.editorUpdate$
      .pipe(
        debounce(() => {
          return this.isInvalid ? timer(0) : timer(500);
        }),
      )
      .subscribe(async (value: string) => {
        const md = await this.safeGetMarkdownFromHtml(value);
        this.onChange.emit(md as string);
      });
  }

  private safeGetHtmlFromMarkdown(md: string, options?: MarkdownToHtmlOptions) {
    try {
      const response = markdownToHtml(md, options);
      return response;
    } catch (error) {
      this.logger.error('Error', error);
      return '';
    }
  }

  private async safeGetMarkdownFromHtml(html: string) {
    try {
      const response = await htmlToMarkdown(html);
      return response;
    } catch (error) {
      this.logger.error('Error', error);
      return '';
    }
  }

  ngOnDestroy() {
    this.editor?.destroy();
    this.editorUpdate$.complete();
    this.changeSubscription?.unsubscribe();
    this.touchedSubscription?.unsubscribe();
  }

  validate(control: AbstractControl): ValidationErrors | null {
    if (this.isEmpty) {
      this.isInvalid = true;
      return { required: true };
    }

    this.isInvalid = false;
    return null;
  }
}
