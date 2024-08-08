import { Component, Input, Output, EventEmitter } from '@angular/core';
import {
  CdkDragDrop,
  CdkDrag,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { AiChainModule } from '../../interfaces/ai_chain_module';


@Component({
  selector: 'app-chain-config',
  standalone: true,
  imports: [CdkDropListGroup, CdkDropList, CdkDrag],
  templateUrl: './chain-config.component.html',
  styleUrl: './chain-config.component.scss'
})
export class ChainConfigComponent {
  @Input() available: AiChainModule[] = [];
  selected: AiChainModule[] = [];
  @Output() getSelectedEvent: EventEmitter<AiChainModule[]> = new EventEmitter<AiChainModule[]>();

  drop(event: CdkDragDrop<AiChainModule[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
    this.sendSelectedToParent();
  }

  sendSelectedToParent() {
    this.getSelectedEvent.emit(this.selected);
  }
}
