import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TRIGGER_MENU_OPERATION } from '@flogo-web/client/core';
import { Trigger } from '../../core';
import { TriggerMenuSelectionEvent } from './models';
import { CONTRIB_REFS } from '@flogo-web/core';

export interface TriggerMenuSelectionEvent {
  operation: string;
  trigger: Trigger;
}

@Component({
  selector: 'flogo-flow-triggers-trigger-block',
  templateUrl: './trigger-block.component.html',
  styleUrls: ['./trigger-block.component.less'],
})
export class TriggerBlockComponent {
  @Input()
  trigger: Trigger;
  @Input()
  isSelected: boolean;
  @Output()
  menuItemSelected: EventEmitter<TriggerMenuSelectionEvent> = new EventEmitter<
    TriggerMenuSelectionEvent
  >();

  isShowingMenu = false;
  MENU_OPTIONS: typeof TRIGGER_MENU_OPERATION = TRIGGER_MENU_OPERATION;

  get isLambda(): boolean {
    return this.trigger && this.trigger.ref === CONTRIB_REFS.LAMBDA;
  }

  handleTriggerSelection() {
    this.menuItemSelected.emit({
      operation: TRIGGER_MENU_OPERATION.SHOW_SETTINGS,
      trigger: this.trigger,
    });
  }

  handleTriggerMenuShow() {
    this.isShowingMenu = true;
  }

  handleTriggerMenuHide() {
    this.isShowingMenu = false;
  }

  selectedMenuItem(item: string) {
    this.isShowingMenu = false;
    this.menuItemSelected.emit({ operation: item, trigger: this.trigger });
  }
}
