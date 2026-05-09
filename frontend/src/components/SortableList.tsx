import { ReactNode } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props<T extends { id: string }> {
  items: T[];
  /** Wywoływane po drop'ie z nową kolejnością id-ów. Caller wysyła PATCH. */
  onReorder: (newOrder: T[]) => void;
  /** Render kontent wiersza. Drag handle jest osobny — komponent <DragHandle /> trzeba użyć wewnątrz. */
  renderItem: (item: T) => ReactNode;
}

export default function SortableList<T extends { id: string }>({ items, onReorder, renderItem }: Props<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = items.findIndex((i) => i.id === active.id);
      const newIdx = items.findIndex((i) => i.id === over.id);
      if (oldIdx >= 0 && newIdx >= 0) onReorder(arrayMove(items, oldIdx, newIdx));
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-1">
          {items.map((it) => (
            <SortableRow key={it.id} id={it.id}>
              {renderItem(it)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="border rounded-md bg-white px-2 py-2 flex items-center gap-2">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-gray-400 hover:text-gray-700 px-1 select-none"
        aria-label="Przeciągnij, by zmienić kolejność"
        title="Przeciągnij"
      >
        ⋮⋮
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </li>
  );
}
