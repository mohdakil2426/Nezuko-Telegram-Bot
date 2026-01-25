"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { toast } from "@/hooks/use-toast";

import { AdminApiResponse } from "@/lib/api/types";

export interface AdminUser {
    id: string;
    email: string;
    full_name: string | null;
    role: "owner" | "admin" | "viewer";
    is_active: boolean;
    telegram_id: number | null;
    created_at: string;
    last_login: string | null;
}

export interface CreateAdminData {
    email: string;
    password: string;
    full_name?: string;
    role: "admin" | "viewer";
}

export const adminApi = {
    getAdmins: async () => {
        return api.get<AdminApiResponse<AdminUser[]>>("/admins");
    },

    createAdmin: async (data: CreateAdminData) => {
        return api.post<AdminApiResponse<AdminUser>>("/admins", data);
    },

    deleteAdmin: async (id: string) => {
        return api.delete<AdminApiResponse<any>>(`/admins/${id}`);
    }
};

export function useAdmins() {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ["admins"],
        queryFn: adminApi.getAdmins,
    });

    const createMutation = useMutation({
        mutationFn: adminApi.createAdmin,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admins"] });
            toast({ title: "Admin invited successfully" });
        },
        onError: (error: Error) => {
            toast({
                title: "Failed to invite admin",
                description: error.message,
                variant: "destructive"
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: adminApi.deleteAdmin,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admins"] });
            toast({ title: "Admin removed successfully" });
        },
        onError: (error: Error) => {
            toast({
                title: "Failed to remove admin",
                description: error.message,
                variant: "destructive"
            });
        },
    });

    return {
        admins: query.data?.data,
        isLoading: query.isLoading,
        isError: query.isError,
        createAdmin: createMutation.mutate,
        deleteAdmin: deleteMutation.mutate,
        isCreating: createMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
}
