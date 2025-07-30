import { useState } from "react";
import { formatUnits } from "viem";

interface ApprovalModalProps {
  isOpen: boolean;
  tokenSymbol: "CPH" | "MSK";
  requiredAmount: bigint;
  currentAllowance: bigint;
  onApprove: (unlimited: boolean) => void;
  onClose: () => void;
  isApproving: boolean;
}

export function ApprovalModal({
  isOpen,
  tokenSymbol,
  requiredAmount,
  currentAllowance,
  onApprove,
  onClose,
  isApproving,
}: ApprovalModalProps) {
  const [approvalType, setApprovalType] = useState<"exact" | "unlimited">("unlimited");

  if (!isOpen) return null;

  const formattedRequired = formatUnits(requiredAmount, 18);
  const formattedCurrent = formatUnits(currentAllowance, 18);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={!isApproving ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">🔐 Token Approval Required</h3>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm">
            To place market orders, approve the hook contract to spend your {tokenSymbol} tokens.
          </p>
        </div>

        {/* Allowance Details */}
        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">Current Allowance:</span>
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              {formattedCurrent} {tokenSymbol}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">Required Amount:</span>
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              {formattedRequired} {tokenSymbol}
            </span>
          </div>
        </div>

        {/* Approval Options */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-neutral-900 dark:text-white mb-2">Choose approval amount:</div>

          {/* Exact Amount Option */}
          <label className="flex items-center space-x-3 p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
            <input
              type="radio"
              name="approvalType"
              value="exact"
              checked={approvalType === "exact"}
              onChange={e => setApprovalType(e.target.value as "exact")}
              className="w-4 h-4 text-purple-600 focus:ring-purple-500"
              disabled={isApproving}
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-neutral-900 dark:text-white">
                Approve exact amount ({formattedRequired} {tokenSymbol})
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                More secure, but you&apos;ll need to approve again for future orders
              </div>
            </div>
          </label>

          {/* Unlimited Option */}
          <label className="flex items-center space-x-3 p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
            <input
              type="radio"
              name="approvalType"
              value="unlimited"
              checked={approvalType === "unlimited"}
              onChange={e => setApprovalType(e.target.value as "unlimited")}
              className="w-4 h-4 text-purple-600 focus:ring-purple-500"
              disabled={isApproving}
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-neutral-900 dark:text-white">
                Approve unlimited (recommended)
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Convenient for future transactions, saves gas fees
              </div>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={isApproving}
            className="flex-1 py-3 px-4 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={() => onApprove(approvalType === "unlimited")}
            disabled={isApproving}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-center gap-2">
              {isApproving && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {isApproving ? "Approving..." : `Approve ${tokenSymbol} Tokens`}
            </div>
          </button>
        </div>

        {/* Info Note */}
        <div className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
          💡 This approval allows the smart contract to spend your tokens on your behalf when placing orders.
        </div>
      </div>
    </div>
  );
}
