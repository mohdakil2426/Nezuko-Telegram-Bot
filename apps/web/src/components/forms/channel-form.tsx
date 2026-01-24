"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { useCreateChannel } from "@/lib/hooks/use-channels";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";

const channelSchema = z.object({
    channel_id: z.coerce.number().int().negative({ message: "Channel ID must be a negative integer" }),
    title: z.string().optional(),
    username: z.string().optional(),
    invite_link: z.string().url().optional().or(z.literal("")),
});

type ChannelFormValues = z.infer<typeof channelSchema>;

interface ChannelFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function ChannelForm({ onSuccess, onCancel }: ChannelFormProps) {
    const createChannel = useCreateChannel();

    const form = useForm<ChannelFormValues>({
        resolver: zodResolver(channelSchema),
        defaultValues: {
            channel_id: undefined,
            title: "",
            username: "",
            invite_link: "",
        },
    });

    function onSubmit(data: ChannelFormValues) {
        createChannel.mutate(
            {
                channel_id: data.channel_id,
                title: data.title || null,
                username: data.username || null,
                invite_link: data.invite_link || null,
            },
            {
                onSuccess: () => {
                    toast.success("Channel added successfully");
                    form.reset();
                    onSuccess?.();
                },
                onError: (error) => {
                    toast.error("Failed to add channel");
                    console.error(error);
                },
            }
        );
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="channel_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Channel ID</FormLabel>
                            <FormControl>
                                <Input placeholder="-100123456789" type="number" {...field} />
                            </FormControl>
                            <FormDescription>
                                The numeric ID of the channel (usually starts with -100).
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Title (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="My Awesome Channel" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Username (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="@mychannel" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="invite_link"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Invite Link (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="https://t.me/..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={createChannel.isPending}>
                        {createChannel.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Add Channel
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
