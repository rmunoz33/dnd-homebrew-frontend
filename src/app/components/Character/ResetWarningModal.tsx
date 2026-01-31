const ResetWarningModal = ({
  isOpen,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-base-200 p-6 rounded-lg shadow-xl max-w-md border-2 border-error">
        <h3 className="text-xl font-bold mb-4 text-error">
          Reset Adventure?
        </h3>
        <p className="mb-6 text-base-content">
          Generating a new character will reset your current adventure and clear
          all chat messages. Are you sure you want to continue?
        </p>
        <div className="flex justify-end gap-3">
          <button className="btn btn-neutral" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-error" onClick={onConfirm}>
            Reset Adventure
          </button>
        </div>
      </div>
    </div>
  );
};

export { ResetWarningModal };
