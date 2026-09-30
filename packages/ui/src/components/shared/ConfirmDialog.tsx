import * as React from 'react';
import { styled } from 'styled-components';
import { MdDeleteOutline, MdWarningAmber } from 'react-icons/md';
import { Button } from './Button';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: var(--vw);
  height: var(--vh);
  background-color: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  backdrop-filter: blur(2px);
`;

const Dialog = styled.div`
  background: var(--main-background-color);
  color: var(--text-color);
  border-radius: var(--border-radius);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
  border: 1px solid var(--form-border-color);
  width: 90%;
  max-width: 420px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: modalFadeIn 0.15s ease-out;

  @keyframes modalFadeIn {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--danger-color);
`;

const Message = styled.div`
  font-size: 0.9375rem;
  line-height: 1.5;
  color: var(--text-color);
  word-break: break-word;
`;

const Hint = styled.div`
  font-size: 0.75rem;
  color: var(--dark-text-color);
  display: flex;
  gap: 12px;
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
`;

type Properties = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmDialog = ({
  title = 'Confirm Deletion',
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: Properties) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onCancel, onConfirm]);

  return (
    <Overlay onClick={onCancel}>
      <Dialog onClick={(e) => e.stopPropagation()}>
        <TitleRow>
          <MdWarningAmber size={22} />
          <span>{title}</span>
        </TitleRow>
        <Message>{message}</Message>
        <Hint>
          <span>Press <strong>Enter</strong> to confirm</span>
          <span>Press <strong>Esc</strong> to cancel</span>
        </Hint>
        <ActionRow>
          <Button
            text={cancelText}
            type="secondary"
            disabled={false}
            onClick={onCancel}
          />
          <Button
            text={confirmText}
            icon={<MdDeleteOutline />}
            type="danger"
            disabled={false}
            onClick={onConfirm}
          />
        </ActionRow>
      </Dialog>
    </Overlay>
  );
};
