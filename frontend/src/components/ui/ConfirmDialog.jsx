import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import Button from "./Button.jsx";
import Input from "./Input.jsx";
import Modal from "./Modal.jsx";

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmer cette action",
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  verificationWord,
  variant = "danger",
}) {
  const [enteredWord, setEnteredWord] = useState("");
  const isConfirmationEnabled =
    !verificationWord || enteredWord === verificationWord;

  function closeDialog() {
    setEnteredWord("");
    onClose?.();
  }

  function confirm() {
    setEnteredWord("");
    onConfirm?.();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeDialog}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={closeDialog}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            disabled={!isConfirmationEnabled}
            onClick={confirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          {verificationWord && (
            <>
              <p className="mb-3 text-sm text-slate-600">
                Pour confirmer, saisissez{" "}
                <strong className="font-semibold text-slate-900">
                  {verificationWord}
                </strong>
                .
              </p>
              <Input
                autoComplete="off"
                label="Mot de vérification"
                value={enteredWord}
                onChange={(event) => setEnteredWord(event.target.value)}
              />
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
