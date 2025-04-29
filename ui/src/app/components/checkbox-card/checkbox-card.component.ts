import { NgClass } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';

@Component({
  selector: 'app-checkbox-card',
  templateUrl: './checkbox-card.component.html',
  styleUrls: ['./checkbox-card.component.scss'],
  imports: [NgClass],
  standalone: true,
})
export class CheckboxCardComponent implements OnChanges {
  @Input('value') value: string | number | undefined;
  @Input('checked') checked: boolean = false;
  @Input('onChange') onChange: ((checked: boolean) => void) | undefined;

  @Input('checkboxClass') checkboxClass: string = '';

  @Output('onCheckedChange') changeEmitter: EventEmitter<boolean> =
    new EventEmitter();

  _checked: boolean;

  constructor() {
    this._checked = this.checked ?? false;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['checked']) {
      this._checked = changes['checked'].currentValue;
    }
  }

  handleOnChange = (event: any) => {
    const isChecked = event.target?.checked;
    this._checked = isChecked;

    this.changeEmitter.emit(isChecked);
  };
}
