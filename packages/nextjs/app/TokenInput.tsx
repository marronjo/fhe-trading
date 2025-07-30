import { Token } from "./Token";

interface TokenInputProps {
  token: Token;
  placeholder: string;
  onChange: (value: string) => void;
  label: string;
  readOnly?: boolean;
  isLoading?: boolean;
  balance?: string;
  hasError?: boolean;
}

export function TokenInput({
  token,
  placeholder,
  onChange,
  label,
  readOnly = false,
  isLoading = false,
  balance = "0",
  hasError = false,
}: TokenInputProps) {
  return (
    <div
      className={`rounded-xl px-4 py-3 transition-colors ${
        hasError
          ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          : readOnly
            ? "bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700"
            : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
      }`}
    >
      <div className="flex justify-between items-center">
        <input
          type="number"
          placeholder={placeholder}
          min="0"
          step="1e-18"
          value={token.value}
          onChange={e => onChange(e.target.value)}
          readOnly={readOnly}
          disabled={readOnly}
          className={`bg-transparent text-lg font-medium w-full outline-none transition-colors ${
            hasError
              ? "text-red-600 dark:text-red-400 placeholder-red-400 dark:placeholder-red-500"
              : readOnly
                ? "cursor-not-allowed text-neutral-400 dark:text-neutral-500 placeholder-neutral-300 dark:placeholder-neutral-600"
                : "text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 focus:text-neutral-900 dark:focus:text-white"
          }`}
          aria-label={`${label} amount`}
        />
        <div className="flex items-center ml-2">
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent mr-2"></div>
          )}
          <span
            className={`text-sm transition-colors ${
              readOnly ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            {token.symbol}
          </span>
        </div>
      </div>
      <div className="mt-2 text-xs h-4 flex justify-between items-center">
        <span className="text-neutral-400 dark:text-neutral-500">{readOnly && token.value && "Auto-calculated"}</span>
        <span className="text-neutral-400 dark:text-neutral-500">
          {balance} {token.symbol}
        </span>
      </div>
    </div>
  );
}
