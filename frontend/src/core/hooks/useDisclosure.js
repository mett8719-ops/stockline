import { useCallback, useState } from "react";

/**
 * Gère l'état ouvert/fermé d'une interface.
 * @example const dialog = useDisclosure(); dialog.open();
 */
export function useDisclosure(initialIsOpen = false) {
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((current) => !current), []);

  return { isOpen, open, close, toggle };
}
