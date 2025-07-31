"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
// @ts-ignore - React 19 compatibility issue with react-copy-to-clipboard
import CopyToClipboard from "react-copy-to-clipboard";

interface HashLinkProps {
  hash: string;
  href: string;
  copyable?: boolean;
}

interface CopyButtonProps {
  className?: string;
  address: string;
  copyStrokeWidth?: number;
}

export const HashLink = ({ hash, href, copyable = true }: HashLinkProps) => {
  const ellipsed = hash.slice(0, 6) + "..." + hash.slice(-4);

  return (
    <div className="flex items-center gap-2">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-primary-accent font-reddit-mono hover:underline text-sm transition-colors"
        aria-label={`View transaction ${hash} in block explorer`}
      >
        <span>{ellipsed}</span>
        {/* @ts-ignore - React 19 compatibility issue with lucide-react */}
        <ExternalLink className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      </a>
      {copyable && <CopyButton copyStrokeWidth={2} className="w-4 h-4" address={hash} />}
    </div>
  );
};

export const CopyButton = ({ className, address, copyStrokeWidth }: CopyButtonProps) => {
  const [addressCopied, setAddressCopied] = useState(false);

  return (
    // @ts-ignore - React 19 compatibility issue with react-copy-to-clipboard
    <CopyToClipboard
      text={address}
      onCopy={() => {
        setAddressCopied(true);
        setTimeout(() => {
          setAddressCopied(false);
        }, 800);
      }}
    >
      <button
        onClick={e => e.stopPropagation()}
        type="button"
        className="inline-flex items-center justify-center p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
        aria-label={addressCopied ? "Address copied!" : "Copy address to clipboard"}
      >
        {addressCopied ? (
          // @ts-ignore - React 19 compatibility issue with lucide-react
          <Check className={className} strokeWidth={copyStrokeWidth} aria-hidden="true" />
        ) : (
          // @ts-ignore - React 19 compatibility issue with lucide-react
          <Copy className={className} strokeWidth={copyStrokeWidth} aria-hidden="true" />
        )}
      </button>
    </CopyToClipboard>
  );
};
