import {
  closestCenter,
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { horizontalListSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as React from 'react';
import { ScrollContainer } from 'react-indiana-drag-scroll';
import { styled } from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { List } from '../components/List';
import { AddItem } from '../components/shared/AddItem';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import {
  formatCardTag,
  getCardUid,
  moveCard as moveCardFn,
  moveCardAcrossList as moveCardAcrossListFn,
  moveList as moveListFn,
  type Card as CardModel,
  type Kanban as KanbanModel,
  type List as ListModel,
} from '../utils';
import { actions, kanbanActions, selectors } from '../store';
import { uuid } from 'portable-kanban-core';

const Container = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--main-background-color);
`;

const Contents = styled.div`
  width: 100%;
  height: calc(100vh - var(--header-height));
  display: flex;
  background-color: transparent;
  overflow-x: auto;
  align-items: flex-start;
  align-content: flex-start;
`;

const BatchActionBar = styled.div`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--primary-background-color);
  color: var(--text-color);
  padding: 10px 20px;
  border-radius: var(--border-radius);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 1000;
  border: 1px solid var(--form-border-color);
`;

const BatchButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  background: ${({ $variant }) =>
    $variant === 'danger'
      ? 'var(--danger-color)'
      : $variant === 'secondary'
        ? 'transparent'
        : 'var(--primary-color)'};
  color: ${({ $variant }) =>
    $variant === 'secondary' ? 'var(--text-color)' : '#fff'};
  border: ${({ $variant }) =>
    $variant === 'secondary' ? '1px solid var(--form-border-color)' : 'none'};
  border-radius: var(--border-radius);
  padding: 6px 14px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.85;
  }
`;

type SortableListItemProps = {
  list: ListModel;
  kanban: KanbanModel;
};

const SortableListItem = ({ list, kanban }: SortableListItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: list.id,
    data: { type: 'list' },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    willChange: transform ? 'transform' : 'auto',
  };

  return (
    <div className="list" ref={setNodeRef} style={style}>
      <List kanban={kanban} list={list} dragHandleListeners={listeners} dragHandleAttributes={attributes} />
    </div>
  );
};

type ActiveDrag = { type: 'card'; cardId: string } | { type: 'list'; listId: string } | null;

type Properties = {
  // True when Board is being rendered as the backgrounded element behind an
  // overlay route (Archive Cards, Archive Lists, Filters, EditCard). In that
  // case `useLocation()` below is scoped to the background <Routes location=...>
  // override and always reports '/', so it can't be used to detect this.
  isBackground?: boolean;
};

const Board = ({ isBackground = false }: Properties) => {
  const kanban = selectors.useKanban();
  const storeLists = selectors.useLists();
  const title = selectors.useTitle();
  const setAddCard = actions.useSetAddingCard();
  const addList = kanbanActions.useAddList();
  const setLists = kanbanActions.useSetLists();
  const menuClose = actions.useMenuClose();
  const selectedCardIds = selectors.useSelectedCardIds();
  const clearSelectedCards = actions.useClearSelectedCards();
  const archiveCards = kanbanActions.useArchiveCards();

  const navigate = useNavigate();
  const location = useLocation();
  const hoveredCardInfo = selectors.useHoveredCard();
  const deleteActiveCard = kanbanActions.useDeleteActiveCard();
  const deleteActiveCards = kanbanActions.useDeleteActiveCards();
  const copyCard = kanbanActions.useCopyCard();
  const toggleSelectCard = actions.useToggleSelectCard();

  const [showAddListInput, setShowAddListInput] = React.useState(false);
  const [activeDrag, setActiveDrag] = React.useState<ActiveDrag>(null);
  const [localLists, setLocalLists] = React.useState<ListModel[] | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState<{
    cards: CardModel[];
    message: string;
  } | null>(null);

  // During drag use local state for rendering; otherwise use store state
  const lists = localLists ?? storeLists;

  // Ref for synchronous access in callbacks without stale closures
  const localListsRef = React.useRef<ListModel[] | null>(null);
  // Cache the dragged card/list at drag start to avoid searching on every onDragOver
  const overlayCardRef = React.useRef<CardModel | null>(null);
  const overlayListRef = React.useRef<ListModel | null>(null);
  // rAF throttle refs for onDragOver
  const dragOverRafRef = React.useRef<number | null>(null);
  const pendingDragOverRef = React.useRef<DragOverEvent | null>(null);

  // Global key listener for shortcuts:
  // - Ctrl+D / Cmd+D: directly delete hovered card or selected cards
  // - d: show delete confirmation dialog for hovered card or selected cards
  // - a: archive hovered card or selected cards
  // - Space: toggle select hovered card
  // - c: copy/duplicate hovered card, or open Archived Cards when no card is hovered
  // - l: open Archived List
  // - Enter: open hovered card
  // - Escape: clear selection
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only handle board shortcuts when directly on board view (not backgrounded
      // behind an overlay route like Archive Cards or EditCard)
      if (isBackground) return;

      // If a confirmation dialog is active, let it handle its own keys
      if (deleteConfirmation) return;

      const activeEl = document.activeElement;
      const isEditingText =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      if (isEditingText) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const keyLower = e.key.toLowerCase();

      // Ctrl + d / Cmd + d: directly delete without confirmation
      if (isCtrlOrCmd && keyLower === 'd') {
        e.preventDefault();
        if (selectedCardIds.length > 0) {
          deleteActiveCards(selectedCardIds);
          clearSelectedCards();
        } else if (hoveredCardInfo) {
          deleteActiveCard(getCardUid(hoveredCardInfo.card));
        }
        return;
      }

      // d (without Ctrl): open delete confirmation dialog
      if (!isCtrlOrCmd && !e.altKey && keyLower === 'd') {
        if (selectedCardIds.length > 0) {
          e.preventDefault();
          const selectedCards = lists
            .flatMap((l) => l.cards)
            .filter((c) => selectedCardIds.includes(getCardUid(c)));
          setDeleteConfirmation({
            cards: selectedCards,
            message: `Are you sure you want to permanently delete ${selectedCardIds.length} selected card(s)?`,
          });
        } else if (hoveredCardInfo) {
          e.preventDefault();
          setDeleteConfirmation({
            cards: [hoveredCardInfo.card],
            message: `Are you sure you want to permanently delete "${hoveredCardInfo.card.title || 'Untitled Card'}" (${formatCardTag(hoveredCardInfo.card)})?`,
          });
        }
        return;
      }

      // a: archive
      if (!isCtrlOrCmd && !e.altKey && keyLower === 'a') {
        if (selectedCardIds.length > 0) {
          e.preventDefault();
          archiveCards(selectedCardIds);
          clearSelectedCards();
        } else if (hoveredCardInfo) {
          e.preventDefault();
          archiveCards([getCardUid(hoveredCardInfo.card)]);
        }
        return;
      }

      // Space: toggle selection
      if (!isCtrlOrCmd && !e.altKey && e.key === ' ') {
        if (hoveredCardInfo) {
          e.preventDefault();
          toggleSelectCard(getCardUid(hoveredCardInfo.card));
        }
        return;
      }

      // c: copy/duplicate hovered card, or open Archived Cards when nothing is hovered
      if (!isCtrlOrCmd && !e.altKey && keyLower === 'c') {
        e.preventDefault();
        if (hoveredCardInfo) {
          copyCard(hoveredCardInfo.card);
        } else {
          navigate('/archive/cards', { state: { backgroundLocation: location } });
        }
        return;
      }

      // l: open Archived List
      if (!isCtrlOrCmd && !e.altKey && keyLower === 'l') {
        e.preventDefault();
        navigate('/archive/lists', { state: { backgroundLocation: location } });
        return;
      }

      // Enter: open card
      if (!isCtrlOrCmd && !e.altKey && e.key === 'Enter') {
        if (hoveredCardInfo) {
          e.preventDefault();
          navigate(`/list/${hoveredCardInfo.listId}/card/${getCardUid(hoveredCardInfo.card)}`);
        }
        return;
      }

      // ArrowUp / ArrowDown: move selected cards one position within their list
      if (!isCtrlOrCmd && !e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        if (selectedCardIds.length > 0) {
          e.preventDefault();
          const up = e.key === 'ArrowUp';
          const selected = new Set(selectedCardIds);
          let changed = false;
          const next = lists.map((l) => {
            const cards = [...l.cards];
            const isSel = (c: CardModel) => selected.has(getCardUid(c));
            if (!cards.some(isSel)) return l;
            const order = cards.map((_, i) => i);
            if (!up) order.reverse();
            for (const i of order) {
              const j = up ? i - 1 : i + 1;
              if (isSel(cards[i]) && j >= 0 && j < cards.length && !isSel(cards[j])) {
                [cards[i], cards[j]] = [cards[j], cards[i]];
                changed = true;
              }
            }
            return { ...l, cards };
          });
          if (changed) {
            setLists(next);
            const targetId = selectedCardIds[up ? 0 : selectedCardIds.length - 1];
            requestAnimationFrame(() => {
              const el = Array.from(document.querySelectorAll('[data-card-id]')).find((n) =>
                (n as HTMLElement).dataset.cardId === targetId,
              );
              el?.scrollIntoView({ block: 'nearest' });
            });
          }
        }
        return;
      }

      // Escape: clear selection
      if (e.key === 'Escape') {
        if (selectedCardIds.length > 0) {
          clearSelectedCards();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [
    deleteConfirmation,
    selectedCardIds,
    hoveredCardInfo,
    lists,
    setLists,
    clearSelectedCards,
    archiveCards,
    deleteActiveCard,
    deleteActiveCards,
    copyCard,
    toggleSelectCard,
    navigate,
    location,
    isBackground,
  ]);

  // Pointer-based auto-scroll while dragging: scrolls the list under the pointer
  // (vertical) and the board (horizontal) when the pointer nears an edge.
  React.useEffect(() => {
    if (!activeDrag) return undefined;
    const pointer = { x: -1, y: -1 };
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };
    const speed = (dist: number, zone: number) => Math.ceil(((zone - dist) / zone) * 20);
    let raf = 0;
    const tick = () => {
      if (pointer.x >= 0) {
        if (activeDrag.type === 'card') {
          const scrollers = Array.from(document.querySelectorAll<HTMLElement>('[data-list-scroll]'));
          const target = scrollers.find((el) => {
            const r = el.getBoundingClientRect();
            return pointer.x >= r.left && pointer.x <= r.right;
          });
          if (target) {
            const r = target.getBoundingClientRect();
            const zone = Math.min(80, r.height / 3);
            if (pointer.y < r.top + zone) target.scrollTop -= speed(Math.max(pointer.y - r.top, 0), zone);
            else if (pointer.y > r.bottom - zone) target.scrollTop += speed(Math.max(r.bottom - pointer.y, 0), zone);
          }
        }
        const board = document.querySelector<HTMLElement>('[data-board-scroll]');
        if (board) {
          const r = board.getBoundingClientRect();
          const zone = 60;
          if (pointer.x < r.left + zone) board.scrollLeft -= speed(Math.max(pointer.x - r.left, 0), zone);
          else if (pointer.x > r.right - zone) board.scrollLeft += speed(Math.max(r.right - pointer.x, 0), zone);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [activeDrag]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const listIds = React.useMemo(() => lists.map((l) => l.id), [lists]);

  const updateLocalLists = React.useCallback((newLists: ListModel[] | null) => {
    localListsRef.current = newLists;
    setLocalLists(newLists);
  }, []);

  const onDragStart = React.useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const type = active.data.current?.type as string | undefined;
      const snapshot = [...storeLists];
      // Snapshot store lists into local state at drag start
      updateLocalLists(snapshot);
      if (type === 'card') {
        const cardId = active.id as string;
        for (const l of snapshot) {
          const found = l.cards.find((c) => c.id === cardId);
          if (found) {
            overlayCardRef.current = found;
            break;
          }
        }
        overlayListRef.current = null;
        setActiveDrag({ type: 'card', cardId });
      } else if (type === 'list') {
        const listId = active.id as string;
        overlayListRef.current = snapshot.find((l) => l.id === listId) ?? null;
        overlayCardRef.current = null;
        setActiveDrag({ type: 'list', listId });
      }
    },
    [storeLists, updateLocalLists],
  );

  // Prefer card-level droppables over list-level droppables to avoid
  // the DragOverlay center landing on a list container when the pointer
  // is still within a card (e.g. hovering near the bottom edge of a card).
  const collisionDetection = React.useCallback((args: Parameters<typeof closestCenter>[0]) => {
    const pointerCollisions = pointerWithin(args);
    const cardCollisions = pointerCollisions.filter(({ id }) => {
      const container = args.droppableContainers.find((c) => c.id === id);
      return container?.data?.current?.type === 'card';
    });
    if (cardCollisions.length > 0) return cardCollisions;
    if (pointerCollisions.length > 0) return pointerCollisions;
    return closestCenter(args);
  }, []);

  const processDragOver = React.useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeType = active.data.current?.type as string | undefined;
      if (activeType !== 'card') return;

      const current = localListsRef.current;
      if (!current) return;

      // Search local state for the card's current list (active.data.listId is stale after cross-list moves)
      const fromList = current.find((l) => l.cards.some((c) => c.id === active.id));
      if (!fromList) return;

      const overType = over.data.current?.type as string | undefined;
      const toListId = overType === 'card' ? (over.data.current?.listId as string) : (over.id as string);
      const toList = current.find((l) => l.id === toListId);
      if (!toList) return;

      const fromIndex = fromList.cards.findIndex((c) => c.id === active.id);

      if (fromList.id === toListId) {
        // Same-list reorder — handle here so position is always up-to-date
        if (overType !== 'card') return;
        const toIndex = toList.cards.findIndex((c) => c.id === over.id);
        if (toIndex < 0 || fromIndex === toIndex) return;
        updateLocalLists(moveCardFn(current, fromList.id, fromIndex, toIndex));
      } else {
        // Cross-list move
        const toIndex =
          overType === 'card' ? (toList.cards.findIndex((c) => c.id === over.id) ?? 0) : toList.cards.length;
        updateLocalLists(moveCardAcrossListFn(current, fromList.id, fromIndex, toListId, toIndex));
      }
    },
    [updateLocalLists],
  );

  // Throttle onDragOver to one update per animation frame to avoid excessive re-renders
  const onDragOver = React.useCallback(
    (event: DragOverEvent) => {
      pendingDragOverRef.current = event;
      if (dragOverRafRef.current !== null) return;
      dragOverRafRef.current = requestAnimationFrame(() => {
        dragOverRafRef.current = null;
        const pending = pendingDragOverRef.current;
        pendingDragOverRef.current = null;
        if (pending) processDragOver(pending);
      });
    },
    [processDragOver],
  );

  const onDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      // Cancel any pending rAF to avoid processing a stale drag-over after drop
      if (dragOverRafRef.current !== null) {
        cancelAnimationFrame(dragOverRafRef.current);
        dragOverRafRef.current = null;
        pendingDragOverRef.current = null;
      }
      setActiveDrag(null);
      const { active, over } = event;
      const current = localListsRef.current ?? storeLists;

      // Dropped outside any droppable — revert without saving
      if (!over) {
        updateLocalLists(null);
        return;
      }

      let finalLists = current;

      // Card moves are fully applied by onDragOver; only list reorder remains
      if (active.id !== over.id) {
        const activeType = active.data.current?.type as string | undefined;
        if (activeType === 'list') {
          const fromIndex = current.findIndex((l) => l.id === active.id);
          const toIndex = current.findIndex((l) => l.id === over.id);
          if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
            finalLists = moveListFn(current, fromIndex, toIndex);
          }
        }
      }

      // Commit to store (triggers VSCode file save)
      setLists(finalLists);
      updateLocalLists(null);
    },
    [storeLists, setLists, updateLocalLists],
  );

  // A cancelled drag (e.g. Escape) never reaches onDragEnd; without this the stale
  // local snapshot keeps shadowing the store and later store updates look ignored.
  const onDragCancel = React.useCallback(() => {
    if (dragOverRafRef.current !== null) {
      cancelAnimationFrame(dragOverRafRef.current);
      dragOverRafRef.current = null;
      pendingDragOverRef.current = null;
    }
    setActiveDrag(null);
    updateLocalLists(null);
  }, [updateLocalLists]);

  // Store changed outside a drag (archive, move-all, ...): drop any stale snapshot.
  React.useEffect(() => {
    if (!activeDrag) {
      updateLocalLists(null);
    }
  }, [storeLists, activeDrag, updateLocalLists]);

  return kanban ? (
    <Container
      onClick={() => {
        if (selectedCardIds.length > 0) {
          clearSelectedCards();
        }
        setAddCard(undefined);
        setShowAddListInput(false);
        menuClose();
      }}
      onDoubleClick={() => {
        setShowAddListInput(true);
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape') {
          if (selectedCardIds.length > 0) {
            clearSelectedCards();
          }
          setAddCard(undefined);
          setShowAddListInput(false);
          menuClose();
        }
      }}
    >
      <Header title={title ?? 'untitled'} />
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        autoScroll={false}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <Contents>
          <ScrollContainer
            data-board-scroll
            mouseScroll={{ ignoreElements: '.list' }}
            style={{
              width: '100%',
              height: 'calc(100vh - var(--header-height))',
              display: 'flex',
              backgroundColor: 'transparent',
              overflowX: 'auto',
              alignItems: 'flex-start',
              alignContent: 'flex-start',
            }}
          >
            <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
              {lists.map((l) => (
                <SortableListItem key={l.id} list={l} kanban={kanban} />
              ))}
            </SortableContext>
            <div style={{ margin: '8px' }}>
              <AddItem
                showInput={showAddListInput}
                addText="Add List"
                placeholder="Enter list title"
                type="primary"
                onEnter={(t) => {
                  addList({
                    id: uuid(),
                    title: t,
                    cards: [],
                  });
                }}
              />
            </div>
          </ScrollContainer>
        </Contents>
        <DragOverlay>
          {activeDrag?.type === 'card' && overlayCardRef.current ? (
            <Card card={overlayCardRef.current} editable={false} />
          ) : null}
          {activeDrag?.type === 'list' && overlayListRef.current ? (
            <List kanban={kanban} list={overlayListRef.current} />
          ) : null}
        </DragOverlay>
      </DndContext>
      {selectedCardIds.length > 0 && (
        <BatchActionBar onClick={(e) => e.stopPropagation()}>
          <span>
            Selected <strong>{selectedCardIds.length}</strong> card{selectedCardIds.length > 1 ? 's' : ''}
          </span>
          <BatchButton
            onClick={() => {
              archiveCards(selectedCardIds);
              clearSelectedCards();
            }}
          >
            Archive (a)
          </BatchButton>
          <BatchButton
            $variant="danger"
            onClick={() => {
              const selectedCards = lists
                .flatMap((l) => l.cards)
                .filter((c) => selectedCardIds.includes(getCardUid(c)));
              setDeleteConfirmation({
                cards: selectedCards,
                message: `Are you sure you want to permanently delete ${selectedCardIds.length} selected card(s)?`,
              });
            }}
          >
            Delete (d / Ctrl+d)
          </BatchButton>
          <BatchButton
            $variant="secondary"
            onClick={() => {
              clearSelectedCards();
            }}
          >
            Cancel (Esc)
          </BatchButton>
        </BatchActionBar>
      )}
      {deleteConfirmation && (
        <ConfirmDialog
          title="Delete Card"
          message={deleteConfirmation.message}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => {
            const cardUids = deleteConfirmation.cards.map((c) => getCardUid(c));
            deleteActiveCards(cardUids);
            clearSelectedCards();
            setDeleteConfirmation(null);
          }}
          onCancel={() => setDeleteConfirmation(null)}
        />
      )}
    </Container>
  ) : (
    <></>
  );
};

export { Board };
