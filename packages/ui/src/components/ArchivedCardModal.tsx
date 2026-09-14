import { format } from 'date-fns/format';
import * as React from 'react';
import {
  MdAccessTime,
  MdCheck,
  MdClose,
  MdComment,
  MdDateRange,
  MdDeleteOutline,
  MdFolder,
  MdOutlineDescription,
  MdRestore,
} from 'react-icons/md';
import { styled } from 'styled-components';
import { type Card as CardModel } from 'portable-kanban-core';
import { Button } from './shared/Button';
import { ConfirmDialog } from './shared/ConfirmDialog';

const Overlay = styled.div`
  width: 100vw;
  height: 100vh;
  position: fixed;
  display: flex;
  flex-direction: column;
  background-color: rgba(0, 0, 0, 0.45);
  top: 0;
  left: 0;
  z-index: 2000;
`;

const Container = styled.div`
  position: absolute;
  width: calc(100% - 32px);
  max-height: calc(100vh - 48px);
  max-width: 720px;
  display: flex;
  flex-direction: column;
  background-color: var(--primary-background-color);
  color: var(--text-color);
  top: 50%;
  left: 50%;
  transform: translateY(-50%) translateX(-50%);
  border-radius: var(--border-radius);
  padding: 24px;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.75rem;
  color: var(--text-color);
  word-break: break-word;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: var(--text-color);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  opacity: 0.7;
  &:hover {
    opacity: 1;
    background-color: var(--hover-color);
  }
`;

const SnapshotBanner = styled.div`
  background-color: var(--secondary-background-color);
  border-left: 4px solid var(--primary-color);
  padding: 12px 16px;
  border-radius: 4px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SnapshotItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
`;

const Section = styled.div`
  margin-bottom: 20px;
`;

const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 8px;
  color: var(--text-color);
`;

const LabelsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
`;

const LabelBadge = styled.span<{ $color: string }>`
  background-color: ${({ $color }) => $color};
  color: #fff;
  padding: 2px 10px;
  border-radius: var(--border-radius);
  font-size: 0.8rem;
  font-weight: 600;
`;

const DescriptionBox = styled.div`
  background-color: var(--secondary-background-color);
  padding: 12px;
  border-radius: var(--border-radius);
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.9rem;
  line-height: 1.5;
`;

const CheckboxList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const CheckboxItem = styled.div<{ $checked: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: ${({ $checked }) => ($checked ? 'var(--dark-text-color)' : 'var(--text-color)')};
  text-decoration: ${({ $checked }) => ($checked ? 'line-through' : 'none')};
`;

const CommentsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CommentItem = styled.div`
  background-color: var(--secondary-background-color);
  padding: 10px;
  border-radius: var(--border-radius);
  font-size: 0.875rem;
  white-space: pre-wrap;
`;

const Timeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
  padding-left: 12px;
  border-left: 2px solid var(--form-border-color);
`;

const TimelineItem = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
  font-size: 0.85rem;

  &::before {
    content: '';
    position: absolute;
    left: -18px;
    top: 4px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: var(--primary-color);
  }
`;

const TimelineHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
`;

const TimelineTime = styled.span`
  color: var(--dark-text-color);
  font-size: 0.75rem;
  font-weight: normal;
`;

const TimelineDetail = styled.div`
  margin-top: 2px;
  color: var(--text-color);
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--form-border-color);
`;

const formatIso = (isoString?: string) => {
  if (!isoString) return 'Unknown';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return format(d, 'yyyy-MM-dd HH:mm:ss');
  } catch {
    return isoString;
  }
};

type Properties = {
  card: CardModel;
  onClose: () => void;
  onRestore: (card: CardModel) => void;
  onDelete: (card: CardModel) => void;
};

export const ArchivedCardModal = ({ card, onClose, onRestore, onDelete }: Properties) => {
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If confirmation dialog is open, let it handle its own keys
      if (showConfirmDelete) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const keyLower = e.key.toLowerCase();

      // Ctrl + d / Cmd + d: directly delete without confirmation
      if (isCtrlOrCmd && keyLower === 'd') {
        e.preventDefault();
        onDelete(card);
        onClose();
        return;
      }

      // d (without Ctrl): show delete confirmation
      if (!isCtrlOrCmd && !e.altKey && keyLower === 'd') {
        e.preventDefault();
        setShowConfirmDelete(true);
        return;
      }

      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [card, onClose, onDelete, showConfirmDelete]);

  const archivedBlockTitle = card.archivedFromList?.title ?? 'Unknown Block';
  const archivedDate = formatIso(card.archivedAt);

  return (
    <Overlay onClick={onClose}>
      <Container onClick={(e) => e.stopPropagation()}>
        <HeaderRow>
          <Title>{card.title || 'Untitled Card'}</Title>
          <CloseButton onClick={onClose} aria-label="Close">
            <MdClose />
          </CloseButton>
        </HeaderRow>

        {/* Snapshot Banner: Shows snapshot info of the block at archive time */}
        <SnapshotBanner>
          <SnapshotItem>
            <MdFolder style={{ color: 'var(--primary-color)' }} />
            <span>
              <strong>Archived from Block:</strong> {archivedBlockTitle}
            </span>
          </SnapshotItem>
          <SnapshotItem>
            <MdAccessTime style={{ color: 'var(--primary-color)' }} />
            <span>
              <strong>Archived At:</strong> {archivedDate}
            </span>
          </SnapshotItem>
        </SnapshotBanner>

        {/* Labels */}
        {card.labels.length > 0 && (
          <LabelsContainer>
            {card.labels.map((l) => (
              <LabelBadge key={l.id} $color={l.color}>
                {l.title}
              </LabelBadge>
            ))}
          </LabelsContainer>
        )}

        {/* Due Date */}
        {card.dueDate && (
          <Section>
            <SectionTitle>
              <MdDateRange />
              <span>Due Date: {typeof card.dueDate === 'string' ? card.dueDate : card.dueDate.toDateString()}</span>
            </SectionTitle>
          </Section>
        )}

        {/* Description */}
        {card.description && (
          <Section>
            <SectionTitle>
              <MdOutlineDescription />
              <span>Description</span>
            </SectionTitle>
            <DescriptionBox>{card.description}</DescriptionBox>
          </Section>
        )}

        {/* Tasks */}
        {card.checkboxes.length > 0 && (
          <Section>
            <SectionTitle>
              <MdCheck />
              <span>
                Task List ({card.checkboxes.filter((c) => c.checked).length}/{card.checkboxes.length})
              </span>
            </SectionTitle>
            <CheckboxList>
              {card.checkboxes.map((c) => (
                <CheckboxItem key={c.id} $checked={c.checked}>
                  <input type="checkbox" checked={c.checked} readOnly />
                  <span>{c.title}</span>
                </CheckboxItem>
              ))}
            </CheckboxList>
          </Section>
        )}

        {/* Comments */}
        {card.comments.length > 0 && (
          <Section>
            <SectionTitle>
              <MdComment />
              <span>Comments ({card.comments.length})</span>
            </SectionTitle>
            <CommentsList>
              {card.comments.map((c) => (
                <CommentItem key={c.id}>{c.comment}</CommentItem>
              ))}
            </CommentsList>
          </Section>
        )}

        {/* Activity Timeline / Audit Log */}
        <Section>
          <SectionTitle>
            <MdAccessTime />
            <span>Activity History (Lifecycle Audit Log)</span>
          </SectionTitle>
          {card.activities && card.activities.length > 0 ? (
            <Timeline>
              {card.activities.map((act) => {
                let header = '';
                let detail = '';
                switch (act.type) {
                  case 'created':
                    header = '🌟 Card Created';
                    detail = act.detail?.toListTitle ? `Created in block "${act.detail.toListTitle}"` : 'Card created';
                    break;
                  case 'moved':
                    header = '➡️ Card Moved';
                    detail = `Moved from "${act.detail?.fromListTitle ?? 'Unknown'}" to "${act.detail?.toListTitle ?? 'Unknown'}"`;
                    break;
                  case 'archived':
                    header = '📦 Card Archived';
                    detail = `Archived from block "${act.detail?.archivedFromListTitle ?? act.detail?.fromListTitle ?? archivedBlockTitle}"`;
                    break;
                  case 'restored':
                    header = '🔄 Card Restored';
                    detail = `Restored to block "${act.detail?.toListTitle ?? 'Unknown'}"`;
                    break;
                  default:
                    header = `Action: ${act.type}`;
                }
                return (
                  <TimelineItem key={act.id}>
                    <TimelineHeader>
                      <span>{header}</span>
                      <TimelineTime>{formatIso(act.timestamp)}</TimelineTime>
                    </TimelineHeader>
                    {detail && <TimelineDetail>{detail}</TimelineDetail>}
                  </TimelineItem>
                );
              })}
            </Timeline>
          ) : (
            <div style={{ fontSize: '0.85rem', color: 'var(--dark-text-color)', fontStyle: 'italic', paddingLeft: '8px' }}>
              Created prior to activity logging. Archived at {archivedDate} from block &quot;{archivedBlockTitle}&quot;.
            </div>
          )}
        </Section>

        {/* Action Row: Restore / Delete / Close */}
        <ActionRow>
          <Button
            text="Restore"
            icon={<MdRestore />}
            type="primary"
            disabled={false}
            onClick={() => {
              onRestore(card);
              onClose();
            }}
          />
          <Button
            text="Delete"
            icon={<MdDeleteOutline />}
            type="danger"
            disabled={false}
            onClick={() => {
              setShowConfirmDelete(true);
            }}
          />
          <Button
            text="Close"
            type="secondary"
            disabled={false}
            onClick={onClose}
          />
        </ActionRow>
      </Container>
      {showConfirmDelete && (
        <ConfirmDialog
          title="Delete Archived Card"
          message={`Are you sure you want to permanently delete "${card.title || 'Untitled Card'}"?`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => {
            setShowConfirmDelete(false);
            onDelete(card);
            onClose();
          }}
          onCancel={() => setShowConfirmDelete(false)}
        />
      )}
    </Overlay>
  );
};
