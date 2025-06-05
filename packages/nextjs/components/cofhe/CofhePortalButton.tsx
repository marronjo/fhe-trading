"use client";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { ShieldCheckIcon } from "@heroicons/react/24/solid";

/**
 * CofhePortalButton button which allows you to manage CoFHE access permits, view cofhejs initialization status, and manually decrypt encrypted data.
 */
export const CofhePortalButton = () => {
  return (
    <div
      className="ml-1 tooltip tooltip-bottom tooltip-primary font-bold before:left-auto before:transform-none before:content-[attr(data-tip)] before:-translate-x-2/5"
      data-tip="CoFHE Portal"
    >
      <button className="btn btn-cofhe btn-sm px-2 rounded-full">
        <ShieldCheckIcon className="h-4 w-4" />
        <ChevronDownIcon className="h-4 w-4" />
      </button>
    </div>
  );
};
