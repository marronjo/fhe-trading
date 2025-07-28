interface SubmitButtonProps {
  text: string;
  onClick: () => void;
  disabled: boolean;
  isLoading?: boolean;
}

export function SubmitButton({ text, onClick, disabled, isLoading = false }: SubmitButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-white text-base py-3 rounded-xl transition ${
        disabled ? "bg-neutral-400 cursor-not-allowed" : "bg-gradient-to-r from-purple-500 to-blue-500 hover:opacity-90"
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        {isLoading && (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        )}
        {text}
      </div>
    </button>
  );
}
