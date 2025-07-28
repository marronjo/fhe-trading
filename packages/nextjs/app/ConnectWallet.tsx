export function ConnectWallet() {
  return (
    <div className="max-w-md w-full mx-auto mt-10 bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">Connect Your Wallet</h3>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm">
          Please connect your wallet to start trading and using the swap functionality.
        </p>
        <div className="pt-2">
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            Click the &quot;Connect Wallet&quot; button in the top navigation to get started.
          </p>
        </div>
      </div>
    </div>
  );
}
