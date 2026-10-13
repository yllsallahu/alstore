"use client";

import { Menu, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { NavLinks } from "./nav-links";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label="Hap menynë">
          <Menu aria-hidden />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-ink/40 fixed inset-0 z-40" />
        <Dialog.Content className="bg-surface fixed inset-y-0 left-0 z-50 flex w-[min(20rem,85vw)] flex-col shadow-xl">
          <div className="border-line flex h-14 items-center justify-between border-b px-4">
            <Dialog.Title className="text-base font-semibold">AL STORE</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Mbyll menynë">
                <X aria-hidden />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Navigimi kryesor i aplikacionit
          </Dialog.Description>
          <nav aria-label="Navigimi kryesor" className="flex-1 overflow-y-auto p-3">
            <NavLinks onNavigate={() => setOpen(false)} />
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
