"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "primary" | "warning";
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "destructive",
  onConfirm,
  isLoading = false,
  icon,
}: ConfirmDialogProps) {
  const getButtonStyles = () => {
    switch (variant) {
      case "destructive":
        return "bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-900/30";
      case "warning":
        return "bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-900/30";
      case "primary":
      default:
        return "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-900/30";
    }
  };

  const getIconWrapper = () => {
    if (icon) return icon;
    switch (variant) {
      case "destructive":
        return (
          <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
        );
      case "warning":
        return (
          <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-white/[0.08] sm:max-w-[420px] p-6 gap-5 bg-[#0f1523]/95 backdrop-blur-xl">
        <div className="flex items-start gap-4">
          {getIconWrapper()}
          <div className="flex-1 space-y-1.5">
            <DialogHeader className="gap-1 text-left">
              <DialogTitle className="font-display font-bold text-lg text-slate-100">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-400 leading-relaxed">
                {description}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <DialogFooter className="bg-transparent border-t border-white/[0.06] pt-4 mt-2 sm:justify-end gap-2 flex-row">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="text-slate-300 hover:bg-white/[0.06] hover:text-white"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`font-semibold cursor-pointer ${getButtonStyles()}`}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
