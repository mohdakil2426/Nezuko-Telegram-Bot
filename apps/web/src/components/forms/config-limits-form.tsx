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
import { useUpdateConfig } from "@/lib/hooks/use-config";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ConfigRateLimiting } from "@nezuko/types";

const limitsSchema = z.object({
    global_limit: z.coerce.number().min(1).max(100),
    per_group_limit: z.coerce.number().min(1).max(50),
});

type LimitsFormValues = z.infer<typeof limitsSchema>;

interface ConfigLimitsFormProps {
    initialData: ConfigRateLimiting;
}

export function ConfigLimitsForm({ initialData }: ConfigLimitsFormProps) {
    const updateConfig = useUpdateConfig();

    const form = useForm<LimitsFormValues>({
        resolver: zodResolver(limitsSchema),
        defaultValues: {
            global_limit: initialData.global_limit,
            per_group_limit: initialData.per_group_limit,
        },
    });

    function onSubmit(data: LimitsFormValues) {
        updateConfig.mutate(
            {
                rate_limiting: {
                    global_limit: data.global_limit,
                    per_group_limit: data.per_group_limit,
                },
            },
            {
                onSuccess: () => {
                    toast.success("Rate limits updated successfully");
                },
                onError: (error) => {
                    toast.error("Failed to update rate limits");
                    console.error(error);
                },
            }
        );
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="global_limit"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Global Rate Limit (msg/sec)</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormDescription>
                                    Maximum messages the bot sends per second across all groups.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="per_group_limit"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Per-Group Rate Limit (msg/sec)</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormDescription>
                                    Maximum messages sent to a single group per second.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Button type="submit" disabled={updateConfig.isPending}>
                    {updateConfig.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Limits
                </Button>
            </form>
        </Form>
    );
}
