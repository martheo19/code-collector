import React from "react";

export function MarianneIcon({
  className = "inline-block size-4 align-text-bottom",
}: {
  className?: string;
}) {
  return (
    <img
      src="/files/denier.png"
      alt="Denier"
      className={`object-contain inline-block ${className}`}
    />
  );
}
