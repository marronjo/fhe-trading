import React from "react";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";

interface EncryptedValueCardProps {
  label: string;
  value: React.ReactNode | null;
  onButtonClick?: () => void;
  buttonText?: string;
}

export const EncryptedValueCard: React.FC<EncryptedValueCardProps> = ({
  label,
  value,
  onButtonClick,
  buttonText = "Reveal",
}) => {
  return (
    <div
      className="flex items-center justify-between rounded-2xl p-4 border-2 bg-white/80 border-transparent shadow-md"
      style={{
        borderImage: "linear-gradient(90deg, #a18fff 0%, #c471f5 100%) 1",
        borderWidth: 2,
        borderStyle: "solid",
      }}
    >
      <div className="flex flex-col gap-1 flex-1">
        <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">{label}</span>
        <div className="mt-1">
          {value === null ? (
            <button
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-400 to-purple-600 text-white font-semibold shadow hover:from-purple-500 hover:to-purple-700 transition"
              onClick={onButtonClick}
              type="button"
            >
              {buttonText}
            </button>
          ) : (
            <span className="text-lg font-bold text-gray-800">{value}</span>
          )}
        </div>
      </div>
      <div className="ml-4 flex items-center justify-center">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 shadow-lg">
          <ShieldCheckIcon className="w-6 h-6 text-white" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
};
