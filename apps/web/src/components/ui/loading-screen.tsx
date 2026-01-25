import { Loader2 } from "lucide-react";

export function LoadingScreen() {
    return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground">
            <div className="relative flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-primary/20 delay-75"></div>
                    <div className="relative rounded-full bg-background p-4 shadow-2xl ring-1 ring-border">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <h3 className="text-xl font-bold tracking-tight">Nezuko</h3>
                    <p className="text-sm text-muted-foreground animate-pulse">Initializing protocols...</p>
                </div>
            </div>
        </div>
    );
}
