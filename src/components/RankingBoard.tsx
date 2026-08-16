"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
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

function SortableMovie({
  movie,
  rank,
  index,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  movie: MovieDTO;
  rank: number;
  index: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: movie.id });
  // L'entrée en fondu joue une fois au montage puis se retire : après ça,
  // seul le style inline de dnd-kit contrôle transform/opacity, sinon
  // l'animation (fill-mode both) écraserait le retour visuel du drag.
  const [entering, setEntering] = useState(true);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onAnimationEnd={() => setEntering(false)}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        animationDelay: entering ? `${index * 45}ms` : undefined,
      }}
      className={`cursor-grab active:cursor-grabbing ${entering ? "animate-fade-in" : ""}`}
    >
      <MovieCard
        movie={movie}
        rank={rank}
        draggable
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />
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

  // MouseSensor (et non PointerSensor) pour ne pas intercepter les gestes
  // tactiles : PointerSensor réagit aussi au touch, ce qui casserait le
  // scroll de la liste sur mobile dès 8px de mouvement.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
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

  function moveMovie(id: string, direction: "up" | "down") {
    setOrder((prev) => {
      const index = prev.indexOf(id);
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      return arrayMove(prev, index, newIndex);
    });
  }

  return (
    <div>
      <p className="mb-4 animate-fade-in-up text-sm text-ink/50">
        Fais glisser les films pour les classer, du plus envie (1) au moins
        envie (5) — ou utilise les flèches ▲▼.
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col border-t border-ink/10">
            {order.map((id, index) => {
              const movie = byId.get(id);
              if (!movie) return null;
              return (
                <SortableMovie
                  key={id}
                  movie={movie}
                  rank={index + 1}
                  index={index}
                  canMoveUp={index > 0}
                  canMoveDown={index < order.length - 1}
                  onMoveUp={() => moveMovie(id, "up")}
                  onMoveDown={() => moveMovie(id, "down")}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
      <button
        onClick={() => onSubmit(order)}
        disabled={submitting}
        className="mt-6 w-full rounded-sm bg-ink px-4 py-3 font-medium text-paper transition-all duration-150 hover:bg-accent active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
      >
        {submitting ? "On envoie…" : "Valider mon classement"}
      </button>
    </div>
  );
}
