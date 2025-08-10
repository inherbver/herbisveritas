"use client";

import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState, useCallback, ReactNode } from "react";

interface LinkDialogProps {
  editor: Editor;
  children: ReactNode;
}

export function LinkDialog({ editor, children }: LinkDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const addLink = useCallback(() => {
    if (!linkUrl) return;

    editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();

    setLinkUrl("");
    setIsOpen(false);
  }, [editor, linkUrl]);

  const removeLink = useCallback(() => {
    editor.chain().focus().unsetLink().run();
  }, [editor]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un lien</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="link-url">URL</Label>
            <Input
              id="link-url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={addLink} disabled={!linkUrl}>
              Ajouter
            </Button>
            {editor.isActive("link") && (
              <Button variant="outline" onClick={removeLink}>
                Supprimer le lien
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
