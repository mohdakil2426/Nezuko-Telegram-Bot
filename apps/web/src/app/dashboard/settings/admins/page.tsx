"use client";

import { useAdmins } from "@/lib/hooks/use-admins";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@tanstack/react-table";
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
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-medium">{row.original.full_name || "N/A"}</span>
                    <span className="text-xs text-muted-foreground">{row.original.email}</span>
                </div>
            ),
        },
        {
            accessorKey: "role",
            header: "Role",
            cell: ({ row }) => {
                const role = row.original.role;
                return (
                    <Badge variant={role === "owner" ? "default" : role === "admin" ? "secondary" : "outline"}>
                        {role.toUpperCase()}
                    </Badge>
                );
            },
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => (
                <Badge variant={row.original.is_active ? "outline" : "destructive"}>
                    {row.original.is_active ? "Active" : "Inactive"}
                </Badge>
            ),
        },
        {
            accessorKey: "last_login",
            header: "Last Login",
            cell: ({ row }) => {
                if (!row.original.last_login) return <span className="text-muted-foreground">-</span>;
                return <span className="whitespace-nowrap">{format(new Date(row.original.last_login), "MMM d, yyyy")}</span>;
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const isAdmin = row.original;
                if (isAdmin.role === "owner") return null;

                return (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive/90"
                        onClick={() => {
                            if (confirm("Are you sure you want to remove this admin?")) {
                                deleteAdmin(isAdmin.id);
                            }
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
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
                        columns={columns}
                        data={admins || []}
                        page={1}
                        pageCount={1}
                        isLoading={isLoading}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
