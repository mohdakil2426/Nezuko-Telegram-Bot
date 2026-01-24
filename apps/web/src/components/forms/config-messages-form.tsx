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
import { Textarea } from "@/components/ui/textarea";
import { useUpdateConfig } from "@/lib/hooks/use-config";
import { toast } from "sonner";
import { Loader2, Info } from "lucide-react";
import { ConfigMessages } from "@nezuko/types";
import { Alert, AlertDescription } from "@/components/ui/alert";

const messagesSchema = z.object({
    welcome_template: z.string().min(1, "Welcome template cannot be empty"),
    verification_prompt: z.string().min(1, "Verification prompt cannot be empty"),
});

type MessagesFormValues = z.infer<typeof messagesSchema>;

interface ConfigMessagesFormProps {
    initialData: ConfigMessages;
}

export function ConfigMessagesForm({ initialData }: ConfigMessagesFormProps) {
    const updateConfig = useUpdateConfig();

    const form = useForm<MessagesFormValues>({
        resolver: zodResolver(messagesSchema),
        defaultValues: {
            welcome_template: initialData.welcome_template,
            verification_prompt: initialData.verification_prompt,
        },
    });

    function onSubmit(data: MessagesFormValues) {
        updateConfig.mutate(
            {
                messages: {
                    welcome_template: data.welcome_template,
                    verification_prompt: data.verification_prompt,
                },
            },
            {
                onSuccess: () => {
                    toast.success("Message templates updated successfully");
                },
                onError: (error) => {
                    toast.error("Failed to update message templates");
                    console.error(error);
                },
            }
        );
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        You can use variables like <code>{`{{username}}`}</code>, <code>{`{{group}}`}</code>, and <code>{`{{link}}`}</code> in your templates.
                    </AlertDescription>
                </Alert>

                <FormField
                    control={form.control}
                    name="welcome_template"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Welcome Message</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Welcome {{username}} to {{group}}!"
                                    className="min-h-[100px] font-mono text-sm"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                Sent when a user joins the group.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="verification_prompt"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Verification Prompt</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Please join our channel to continue."
                                    className="min-h-[100px] font-mono text-sm"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                Displayed on the verification button or message.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={updateConfig.isPending}>
                    {updateConfig.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Messages
                </Button>
            </form>
        </Form>
    );
}
