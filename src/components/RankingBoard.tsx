"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MovieCard } from "@/components/MovieCard";
import type { MovieDTO } from "@/lib/types";

function SortableMovie({ movie, rank }: { movie: MovieDTO; rank: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: movie.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <MovieCard movie={movie} rank={rank} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

export function RankingBoard({
  movies,
  onSubmit,
  submitting,
}: {
  movies: MovieDTO[];
  onSubmit: (order: string[]) => void;
  submitting?: boolean;
}) {
  const [order, setOrder] = useState(movies.map((m) => m.id));
  const byId = new Map(movies.map((m) => [m.id, m]));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.indexOf(String(active.id));
      const newIndex = prev.indexOf(String(over.id));
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  return (
    <div>
      <p className="mb-4 text-sm text-stone-500">
        Glisse les films pour les classer, du plus envie (1) au moins envie
        (5).
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {order.map((id, index) => {
              const movie = byId.get(id);
              if (!movie) return null;
              return <SortableMovie key={id} movie={movie} rank={index + 1} />;
            })}
          </div>
        </SortableContext>
      </DndContext>
      <button
        onClick={() => onSubmit(order)}
        disabled={submitting}
        className="mt-6 w-full rounded-lg bg-stone-900 px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        {submitting ? "Envoi…" : "Valider mon classement"}
      </button>
    </div>
  );
}
