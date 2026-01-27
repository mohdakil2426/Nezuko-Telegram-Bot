"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { queryKeys, mutationKeys } from "@/lib/query-keys";

interface DeleteConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    tableName: string;
    rowId: string;
    rowSummary: string;
}

async function deleteRow(tableName: string, rowId: string, hardDelete: boolean) {
    const response = await fetch(
        `/api/v1/database/tables/${tableName}/${rowId}?hard_delete=${hardDelete}`,
        { method: "DELETE" }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to delete row");
    }

    return response.json();
}

export function DeleteConfirmDialog({
    isOpen,
    onClose,
    tableName,
    rowId,
    rowSummary,
}: DeleteConfirmDialogProps) {
    const [confirmText, setConfirmText] = useState("");
    const [hardDelete, setHardDelete] = useState(false);
    const queryClient = useQueryClient();

    const isConfirmed = confirmText === tableName;

    const mutation = useMutation({
        mutationKey: mutationKeys.database.delete(tableName), // v5: Centralized mutation keys
        mutationFn: () => deleteRow(tableName, rowId, hardDelete),
        onSuccess: () => {
            toast.success(hardDelete ? "Row permanently deleted" : "Row marked as deleted");
            queryClient.invalidateQueries({ queryKey: queryKeys.database.all });
            onClose();
            setConfirmText("");
            setHardDelete(false);
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const handleClose = () => {
        setConfirmText("");
        setHardDelete(false);
        onClose();
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={(open: boolean) => !open && handleClose()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Delete Row
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                        <p>
                            You are about to delete a row from{" "}
                            <code className="font-mono bg-muted px-1 rounded font-semibold">
                                {tableName}
                            </code>
                            .
                        </p>
                        <div className="bg-muted p-3 rounded-lg border">
                            <p className="text-sm font-mono text-foreground">{rowSummary}</p>
                        </div>
                        <p className="text-sm">
                            This action cannot be easily undone. Please type{" "}
                            <code className="font-mono bg-destructive/10 text-destructive px-1 rounded font-semibold">
                                {tableName}
                            </code>{" "}
                            to confirm.
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="confirm-delete">Type table name to confirm</Label>
                        <Input
                            id="confirm-delete"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder={tableName}
                            className={cn(
                                "font-mono",
                                isConfirmed && "border-destructive focus-visible:ring-destructive"
                            )}
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="hard-delete"
                            checked={hardDelete}
                            onCheckedChange={(checked: boolean | "indeterminate") => setHardDelete(checked === true)}
                        />
                        <Label
                            htmlFor="hard-delete"
                            className="text-sm font-medium leading-none cursor-pointer"
                        >
                            Permanently delete (cannot be recovered)
                        </Label>
                    </div>
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleClose} disabled={mutation.isPending}>
                        Cancel
                    </AlertDialogCancel>
                    <Button
                        variant="destructive"
                        onClick={() => mutation.mutate()}
                        disabled={!isConfirmed || mutation.isPending}
                    >
                        {mutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        {hardDelete ? "Permanently Delete" : "Delete Row"}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
