"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { GroupDetail, GroupUpdateRequest } from "@nezuko/types";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useUpdateGroup } from "@/lib/hooks/use-groups";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const groupSettingsSchema = z.object({
    title: z.string().min(1, "Title is required").max(255),
    enabled: z.boolean(),
    params: z.object({
        welcome_message: z.string().optional(),
        restriction_type: z.enum(["kick", "ban", "mute"]),
        auto_kick_after_hours: z.coerce.number().min(0).max(168).optional(), // 1 week max
    }),
});

type GroupSettingsValues = z.infer<typeof groupSettingsSchema>;

interface GroupSettingsFormProps {
    group: GroupDetail;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function GroupSettingsForm({ group, onSuccess, onCancel }: GroupSettingsFormProps) {
    const { toast } = useToast();
    const updateGroupMutation = useUpdateGroup();

    const form = useForm<GroupSettingsValues>({
        resolver: zodResolver(groupSettingsSchema),
        defaultValues: {
            title: group.title || "",
            enabled: group.enabled,
            params: {
                welcome_message: (group.params?.welcome_message as string) || "",
                restriction_type: (group.params?.restriction_type as "kick" | "ban" | "mute") || "kick",
                auto_kick_after_hours: (group.params?.auto_kick_after_hours as number) || 0,
            },
        },
    });

    function onSubmit(data: GroupSettingsValues) {
        // Construct the update payload to match GroupUpdateRequest
        // We need to be careful with nested params updates.
        // Assuming the backend replaces params with the dict we send, or merges.
        // Based on group_service.py implemented in Phase 4.1.8: `group.params = data.params` replaces it.
        // So we must send all params we want to keep.

        const updateData: GroupUpdateRequest = {
            title: data.title,
            enabled: data.enabled,
            params: data.params,
        };

        updateGroupMutation.mutate(
            { id: group.group_id, data: updateData },
            {
                onSuccess: () => {
                    toast({
                        title: "Settings updated",
                        description: "Group settings have been saved successfully.",
                        variant: "default",
                    });
                    onSuccess?.();
                },
                onError: (error) => {
                    toast({
                        title: "Error",
                        description: "Failed to update settings. Please try again.",
                        variant: "destructive",
                    });
                    console.error(error);
                },
            }
        );
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="enabled"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Active Status</FormLabel>
                                <FormDescription>
                                    Enable or disable bot protection for this group.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Group Title</FormLabel>
                            <FormControl>
                                <Input placeholder="My Telegram Group" {...field} />
                            </FormControl>
                            <FormDescription>
                                Used for display purposes in the dashboard.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
                    <h3 className="font-medium text-sm text-text-secondary mb-2">Protection Parameters</h3>

                    <FormField
                        control={form.control}
                        name="params.restriction_type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Restriction Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select restriction type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="kick">Kick User</SelectItem>
                                        <SelectItem value="mute">Mute User</SelectItem>
                                        <SelectItem value="ban">Ban User</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormDescription>
                                    Action to take when a user is not verified.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="params.auto_kick_after_hours"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Grace Period (Hours)</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormDescription>
                                    Time given to join channels before restriction (0 for immediate).
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="params.welcome_message"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Welcome Message</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Welcome to the group! Please verify..."
                                        className="resize-none"
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Custom message sent when a user joins. Leave empty for default.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="flex justify-end gap-4">
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" disabled={updateGroupMutation.isPending}>
                        {updateGroupMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Save Changes
                    </Button>
                </div>
            </form>
        </Form>
    );
}
