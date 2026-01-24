"use client";

import { useSearchParams } from "next/navigation";
import { ChannelsTable } from "@/components/tables/channels-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ChannelForm } from "@/components/forms/channel-form";

export default function ChannelsPage() {
    const searchParams = useSearchParams();
    const [search, setSearch] = useState(searchParams.get("search") || "");
    const debouncedSearch = useDebounce(search, 500);

    const [isAddOpen, setIsAddOpen] = useState(false);

    return (
        <div className="space-y-6 pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-text-primary">Channels</h1>
                    <p className="text-text-secondary">
                        Manage your enforced channels and view subscriber stats.
                    </p>
                </div>
                <Button onClick={() => setIsAddOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Channel
                </Button>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-tertiary" />
                    <Input
                        placeholder="Search channels..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <ChannelsTable search={debouncedSearch} />

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Channel</DialogTitle>
                        <DialogDescription>
                            Enter the channel details manually. Ensure the bot is an admin in the channel.
                        </DialogDescription>
                    </DialogHeader>
                    <ChannelForm
                        onSuccess={() => setIsAddOpen(false)}
                        onCancel={() => setIsAddOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
