"use client";

import { useAdmins } from "@/lib/hooks/use-admins";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { AdminUser } from "@/lib/hooks/use-admins";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminsPage() {
    const { admins, isLoading, createAdmin, deleteAdmin, isCreating } = useAdmins();
    const { user } = useAuthStore();
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        full_name: "",
        role: "viewer" as "admin" | "viewer",
    });

    const isOwner = user?.role === "owner";

    if (!isOwner) {
        return (
            <div className="container mx-auto py-10">
                <Card className="border-destructive">
                    <CardHeader>
                        <CardTitle className="text-destructive">Access Denied</CardTitle>
                        <CardDescription>
                            You do not have permission to view this page. Only the bot owner can manage administrators.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    const columns: ColumnDef<AdminUser>[] = [
        {
            accessorKey: "full_name",
            header: "Name",
            cell: ({ row }: { row: { original: AdminUser } }) => (
                <div className="font-medium">{row.original.full_name || "N/A"}</div>
            ),
        },
        {
            accessorKey: "email",
            header: "Email",
        },
        {
            accessorKey: "role",
            header: "Role",
            cell: ({ row }: { row: { original: AdminUser } }) => (
                <Badge variant="secondary" className="capitalize">
                    {row.original.role}
                </Badge>
            ),
        },
        {
            accessorKey: "is_active",
            header: "Status",
            cell: ({ row }: { row: { original: AdminUser } }) => (
                <Badge
                    variant={row.original.is_active ? "default" : "secondary"}
                    className={row.original.is_active ? "bg-success hover:bg-success/90" : ""}
                >
                    {row.original.is_active ? "Active" : "Inactive"}
                </Badge>
            ),
        },
        {
            accessorKey: "created_at",
            header: "Joined",
            cell: ({ row }: { row: { original: AdminUser } }) => (
                <div className="text-muted-foreground">
                    {format(new Date(row.original.created_at), "MMM d, yyyy")}
                </div>
            ),
        },
        {
            accessorKey: "last_login",
            header: "Last Active",
            cell: ({ row }: { row: { original: AdminUser } }) => (
                <div className="text-muted-foreground">
                    {row.original.last_login
                        ? format(new Date(row.original.last_login), "MMM d, HH:mm")
                        : "Never"}
                </div>
            ),
        },
        {
            id: "actions",
            cell: ({ row }: { row: { original: AdminUser } }) => {
                const admin = row.original;
                // Don't allow deleting yourself
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-error hover:text-error hover:bg-error/10"
                        onClick={() => deleteAdmin(admin.id)}
                    >
                        Delete
                    </Button>
                );
            },
        },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createAdmin(formData, {
            onSuccess: () => {
                setIsInviteOpen(false);
                setFormData({ email: "", password: "", full_name: "", role: "viewer" });
            }
        });
    };

    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [sorting, setSorting] = useState<SortingState>([]);

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Administrators</h1>
                    <p className="text-muted-foreground">
                        Manage who has access to the admin panel and their permissions.
                    </p>
                </div>
                <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Invite Admin
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Invite New Administrator</DialogTitle>
                            <DialogDescription>
                                Create a new account for an administrator. They will be able to log in with these credentials.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Initial Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(val: "admin" | "viewer") => setFormData({ ...formData, role: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin (Can manage groups)</SelectItem>
                                        <SelectItem value="viewer">Viewer (Read-only)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isCreating}>
                                    {isCreating ? "Creating..." : "Create Account"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardContent className="p-0">
                    <DataTable
                        columns={columns as ColumnDef<any, any>[]}
                        data={admins || []}
                        pageCount={1}
                        pagination={pagination}
                        onPaginationChange={setPagination}
                        sorting={sorting}
                        onSortingChange={setSorting}
                        isLoading={isLoading}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
