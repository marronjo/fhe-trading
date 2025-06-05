"use client";

import { useCallback } from "react";
import { ShieldCheckIcon } from "@heroicons/react/24/solid";
import { useCofhejsCreatePermit, useCofhejsModalStore } from "~~/app/useCofhejs";

export const CofhejsPermitModal = () => {
  const { generatePermitModalOpen, generatePermitModalCallback, setGeneratePermitModalOpen } = useCofhejsModalStore();
  const createPermit = useCofhejsCreatePermit();

  const handleClose = useCallback(() => {
    setGeneratePermitModalOpen(false);
  }, [setGeneratePermitModalOpen]);

  const handleGeneratePermit = useCallback(async () => {
    const result = await createPermit();
    if (result?.success) {
      handleClose();
      // If there was a callback provided when opening the modal, execute it
      if (generatePermitModalCallback) {
        generatePermitModalCallback();
      }
    }
  }, [createPermit, generatePermitModalCallback, handleClose]);

  return (
    <>
      <input
        type="checkbox"
        id="cofhejs-permit-modal"
        className="modal-toggle"
        checked={generatePermitModalOpen}
        onChange={() => {}}
      />
      <label htmlFor="cofhejs-permit-modal" className="modal cursor-pointer">
        <label className="modal-box relative">
          {/* dummy input to capture event onclick on modal box */}
          <input className="h-0 w-0 absolute top-0 left-0" />
          <label htmlFor="cofhejs-permit-modal" className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3">
            ✕
          </label>
          <div className="flex items-center justify-center mb-4">
            <ShieldCheckIcon className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-4">Generate CoFHE Permit</h2>
          <p className="text-center mb-6">
            A permit is required to authenticate your identity and grant access to your encrypted data.
          </p>
          <p className="text-center mb-6">
            Generating a permit will open your wallet to sign a message (EIP712) which verifies your ownership of the
            connected wallet.
          </p>
          <div className="flex justify-end gap-4">
            <button className="btn btn-ghost" onClick={handleClose}>
              Cancel
            </button>
            <button className="btn btn-cofhe" onClick={handleGeneratePermit}>
              Generate Permit
            </button>
          </div>
        </label>
      </label>
    </>
  );
};
