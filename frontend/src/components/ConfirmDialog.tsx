import React from 'react';

type ConfirmDialogProps = {
  title?: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean; // shows a spinner / disabled state when true
  center?: boolean; // center message text
  extra?: React.ReactNode; // extra custom content (inputs, etc.)
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title = 'Confirmar',
  message,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  variant = 'info',
  onConfirm,
  onCancel,
  busy = false,
  center = false,
  extra = null,
}) => {
  const colorMap: Record<string, string> = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  };
  const icon = variant === 'danger' ? (
    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 4.93l14.14 14.14M12 2a10 10 0 1010 10A10 10 0 0012 2z" /></svg>
  ) : variant === 'warning' ? (
    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 4.93l14.14 14.14M12 2a10 10 0 1010 10A10 10 0 0012 2z" /></svg>
  ) : (
    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12A9 9 0 113 12a9 9 0 0118 0z" /></svg>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={busy ? undefined : onCancel} />
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-sm p-5 animate-fadeIn">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{icon}</div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-800 mb-1 truncate">{title}</h4>
            <div className={`text-sm text-gray-600 break-words ${center ? 'text-center' : ''}`}>{message}</div>
            {extra && <div className="mt-3">{extra}</div>}
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          {cancelText && (
            <button disabled={busy} onClick={onCancel} className="px-3 py-1 btn-neutral text-sm disabled:opacity-50">{cancelText}</button>
          )}
          <button disabled={busy} onClick={onConfirm} className={`px-3 py-1 text-sm text-white rounded focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 ${colorMap[variant]}`}>{busy ? 'Procesando...' : confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
