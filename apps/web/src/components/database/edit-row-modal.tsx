"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
}

interface EditRowModalProps {
    isOpen: boolean;
    onClose: () => void;
    tableName: string;
    rowId: string;
    rowData: Record<string, unknown>;
    columns: ColumnInfo[];
}

async function updateRow(tableName: string, rowId: string, data: Record<string, unknown>) {
    const response = await fetch(`/api/v1/database/tables/${tableName}/${rowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to update row");
    }

    return response.json();
}

export function EditRowModal({
    isOpen,
    onClose,
    tableName,
    rowId,
    rowData,
    columns,
}: EditRowModalProps) {
    const [formData, setFormData] = useState<Record<string, unknown>>(rowData);
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationKey: ["database", tableName, "update"], // v5: Enable tracking with useMutationState
        mutationFn: () => updateRow(tableName, rowId, formData),
        onSuccess: () => {
            toast.success("Row updated successfully");
            queryClient.invalidateQueries({ queryKey: ["database", tableName] });
            onClose();
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const handleChange = (columnName: string, value: unknown) => {
        setFormData((prev) => ({ ...prev, [columnName]: value }));
    };

    const renderInput = (column: ColumnInfo) => {
        const value = formData[column.name];

        // Skip read-only fields
        if (column.name === "id" || column.name === "created_at" || column.name === "updated_at") {
            return (
                <Input
                    value={String(value ?? "")}
                    disabled
                    className="bg-muted"
                />
            );
        }

        // Boolean fields
        if (column.type.toLowerCase().includes("bool")) {
            return (
                <Switch
                    checked={Boolean(value)}
                    onCheckedChange={(checked) => handleChange(column.name, checked)}
                />
            );
        }

        // Number fields
        if (column.type.toLowerCase().includes("int") || column.type.toLowerCase().includes("float")) {
            return (
                <Input
                    type="number"
                    value={value ? Number(value) : ""}
                    onChange={(e) => handleChange(column.name, e.target.value ? Number(e.target.value) : null)}
                />
            );
        }

        // Default: text input
        return (
            <Input
                value={String(value ?? "")}
                onChange={(e) => handleChange(column.name, e.target.value || null)}
            />
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Row</DialogTitle>
                    <DialogDescription>
                        Editing row <code className="font-mono bg-muted px-1 rounded">{rowId}</code> in{" "}
                        <code className="font-mono bg-muted px-1 rounded">{tableName}</code>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {columns.map((column) => (
                        <div key={column.name} className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor={column.name} className="text-right font-mono text-sm">
                                {column.name}
                                {!column.nullable && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            <div className="col-span-3">
                                {renderInput(column)}
                                <p className="text-xs text-muted-foreground mt-1">{column.type}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
                        Cancel
                    </Button>
                    <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
